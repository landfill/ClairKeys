import java.awt.Rectangle;
import java.awt.geom.CubicCurve2D;
import java.util.*;
import java.util.function.Predicate;
import org.audiveris.omr.glyph.Shape;
import org.audiveris.omr.sheet.*;
import org.audiveris.omr.sig.inter.*;
import org.audiveris.omr.util.HorizontalSide;

/** Exercise actual Part matching with independent heads, orphan lists and curve ordering. */
public class CrossSystemTieFixture {
    static final HorizontalSide LEFT = HorizontalSide.LEFT, RIGHT = HorizontalSide.RIGHT;
    static class StaffStub extends Staff {
        final int index;
        StaffStub(int index) { this.index = index; }
        @Override public int getIndexInPart() { return index; }
    }
    static class HeadStub extends HeadInter {
        NoteStep step;
        int octave;
        HeadStub(int pitch, int staff, int y) {
            super(new Rectangle(100,y,24,20), Shape.NOTEHEAD_BLACK,
                    0.9, new StaffStub(staff), (double)pitch);
            step = pitch == -1 ? NoteStep.C : NoteStep.B;
            octave = pitch == -1 ? 5 : 4;
        }
        @Override public NoteStep getStep() { return step; }
        @Override public int getOctave() { return octave; }
        @Override public AlterInter getMeasureAccidental() { return null; }
    }
    static class Half extends SlurInter {
        final HeadStub head;
        final HorizontalSide side;
        final boolean bowsAbove;
        final CubicCurve2D curve;
        boolean removed;
        boolean geometricallyCompatible = true;
        Half(boolean above, int pitch, int staff, int y, HorizontalSide side) {
            super(above, 0.8);
            this.side = side;
            this.bowsAbove = above;
            head = new HeadStub(pitch, staff, y);
            curve = new CubicCurve2D.Double(100,y,120,y-5,150,y-5,180,y);
        }
        @Override public boolean isAbove() { return bowsAbove; }
        @Override public HeadInter getHead(HorizontalSide query) { return query == side ? head : null; }
        @Override public CubicCurve2D getCurve() { return curve; }
        @Override public boolean canExtend(SlurInter previous) {
            return geometricallyCompatible && previous.getHead(LEFT).getStaff().getIndexInPart()
                    == head.getStaff().getIndexInPart();
        }
        @Override public void remove(boolean extensive) { removed = true; }
    }
    static class PartStub extends Part {
        final List<SlurInter> halves;
        PartStub(SlurInter... halves) { super(null); this.halves = Arrays.asList(halves); }
        @Override public List<SlurInter> getSlurs(Predicate<SlurInter> predicate) {
            return new ArrayList<>(halves);
        }
    }
    static void require(boolean value, String message) {
        if (!value) throw new AssertionError(message);
    }
    static void rescued(Half half) throws Exception {
        SlurInter.class.getMethod("setBoundaryTieOnly", boolean.class).invoke(half,true);
    }
    static Map<SlurInter,SlurInter> pair(Half departing, Half... arriving) {
        return new PartStub(arriving).getCrossSlurLinks(new PartStub(departing));
    }
    public static void main(String[] args) throws Exception {
        Half departing = new Half(true,-1,0,100,LEFT);
        Half phrase = new Half(true,0,0,200,RIGHT);
        Half arriving = new Half(true,-1,0,240,RIGHT);
        Map<SlurInter,SlurInter> links = pair(departing,phrase,arriving);
        require(links.get(arriving) == departing && !links.containsKey(phrase),
                "a higher phrase slur consumed the same-pitch boundary tie");

        // The same staff position after a clef change need not be the same sounding note.
        arriving.head.octave = 4;
        require(pair(departing,phrase,arriving).get(phrase) == departing, "octave mismatch reserved");
        arriving.head.octave = 5;
        Half changedClef = new Half(true,3,0,240,RIGHT);
        changedClef.head.step = AbstractNoteInter.NoteStep.C;
        changedClef.head.octave = 5;
        require(pair(departing,phrase,changedClef).get(changedClef) == departing,
                "equivalent notes at different staff positions lost");

        Half opposite = new Half(false,-1,0,240,RIGHT);
        require(pair(departing,phrase,opposite).get(phrase) == departing, "opposite bow reserved");
        Half otherStaff = new Half(true,-1,1,240,RIGHT);
        require(!pair(departing,otherStaff).containsKey(otherStaff), "cross-staff pair accepted");
        arriving.geometricallyCompatible = false;
        require(!pair(departing,arriving).containsKey(arriving), "geometry guard bypassed");
        arriving.geometricallyCompatible = true;
        Half duplicate = new Half(true,-1,0,250,RIGHT);
        require(pair(departing,phrase,arriving,duplicate).get(phrase) == departing,
                "ambiguous priority changed legacy matching");

        // A rescued half has no permission to use the generic slur fallback.
        Half unmatched = new Half(true,0,0,200,RIGHT);
        rescued(unmatched);
        require(pair(departing,unmatched).isEmpty(), "unmatched rescue became a phrase slur");
        rescued(arriving); rescued(duplicate);
        require(pair(departing,arriving,duplicate).isEmpty(), "ambiguous rescues were paired");
        require(pair(departing,arriving).get(arriving) == departing, "unique rescue rejected");
        arriving.setExtension(LEFT,departing);
        require(pair(departing,arriving).isEmpty(), "pre-existing extension replaced");
        arriving.setExtension(LEFT,null);

        // A later clef/accidental resolution can invalidate a provisional pair; fail closed.
        arriving.head.octave = 4;
        arriving.setExtension(LEFT,departing); departing.setExtension(RIGHT,arriving);
        arriving.checkCrossTie(departing);
        require(arriving.removed && departing.removed, "invalid rescue was exported as slur");
        require(arriving.getExtension(LEFT) == null && departing.getExtension(RIGHT) == null,
                "invalid rescue retained stale extensions");
        Half ordinary = new Half(true,0,0,200,RIGHT);
        Half ordinaryPrev = new Half(true,-1,0,100,LEFT);
        ordinary.checkCrossTie(ordinaryPrev);
        require(!ordinary.removed && !ordinaryPrev.removed && !ordinary.isTie(),
                "normal phrase slur was removed");
        java.lang.System.out.println("cross-system tie pairing OK: 13 scenarios");
    }
}
