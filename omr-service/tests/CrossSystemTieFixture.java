import java.awt.Rectangle;
import java.awt.geom.CubicCurve2D;
import java.util.*;
import java.util.function.Predicate;
import org.audiveris.omr.glyph.Shape;
import org.audiveris.omr.sheet.*;
import org.audiveris.omr.sig.inter.*;
import org.audiveris.omr.util.HorizontalSide;

/** Isolate the real Part pairing traversal from curve extraction and page segmentation. */
public class CrossSystemTieFixture {
    static class StaffStub extends Staff {
        final int index;
        StaffStub(int index) { this.index = index; }
        @Override public int getIndexInPart() { return index; }
    }
    static class Half extends SlurInter {
        final HeadInter head;
        final HorizontalSide side;
        final CubicCurve2D curve;
        Half(boolean above, int pitch, int staff, int y, HorizontalSide side) {
            super(above, 0.8);
            this.side = side;
            head = new HeadInter(new Rectangle(100,y,24,20), Shape.NOTEHEAD_BLACK,
                    0.9, new StaffStub(staff), (double)pitch);
            curve = new CubicCurve2D.Double(100,y,120,y-5,150,y-5,180,y);
        }
        @Override public HeadInter getHead(HorizontalSide query) { return query == side ? head : null; }
        @Override public CubicCurve2D getCurve() { return curve; }
        @Override public boolean canExtend(SlurInter previous) {
            return previous.getHead(HorizontalSide.LEFT).getStaff().getIndexInPart()
                    == head.getStaff().getIndexInPart();
        }
    }
    static class PartStub extends Part {
        final List<SlurInter> halves;
        PartStub(SlurInter... halves) { super(null); this.halves = Arrays.asList(halves); }
        @Override public List<SlurInter> getSlurs(Predicate<SlurInter> predicate) {
            return new ArrayList<>(halves);
        }
    }
    public static void main(String[] args) {
        Half departing = new Half(true,-1,0,100,HorizontalSide.LEFT);
        Half phrase = new Half(true,0,0,200,HorizontalSide.RIGHT);
        Half arriving = new Half(true,-1,0,240,HorizontalSide.RIGHT);
        Map<SlurInter,SlurInter> links = new PartStub(phrase,arriving)
                .getCrossSlurLinks(new PartStub(departing));
        if (links.get(arriving) != departing || links.containsKey(phrase))
            throw new AssertionError("a higher phrase slur consumed the same-pitch boundary tie");
        java.lang.System.out.println("cross-system tie pairing OK");
    }
}
