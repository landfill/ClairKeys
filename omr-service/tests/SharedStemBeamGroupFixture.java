import java.awt.Rectangle;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.List;

import org.audiveris.omr.glyph.Shape;
import org.audiveris.omr.sheet.Staff;
import org.audiveris.omr.sheet.SystemInfo;
import org.audiveris.omr.sheet.symbol.SymbolsLinker;
import org.audiveris.omr.sig.SIGraph;
import org.audiveris.omr.sig.inter.*;
import org.audiveris.omr.sig.relation.*;

/** Native boundary fixture: locally single-staff chords can share a cross-staff beam group.
 * The graph double rejects mutations, so the real splitter must abstain before creating a chord.
 * A same-staff control must reach mutation, proving that the candidate is otherwise eligible.
 */
public class SharedStemBeamGroupFixture {
    private static class MutationAttempt extends AssertionError { }

    private static class Head extends HeadInter {
        Head(Staff staff, Shape shape, double pitch) {
            super(new Rectangle(100, 100, 24, 20), shape, 1.0, staff, pitch);
        }
        @Override public Inter getMirror() { return null; }
        @Override public int getDotCount() { return 0; }
    }

    private static class Group extends BeamGroupInter {
        List<AbstractChordInter> chords;
        @Override public List<AbstractChordInter> getChords() { return chords; }
    }

    private static class Chord extends HeadChordInter {
        final Staff staff;
        final List<Inter> heads;
        final StemInter stem = new StemInter(null, Double.valueOf(1));
        final Group group;
        Chord(Staff staff, Group group, boolean mixed) {
            super(1.0);
            this.staff = staff;
            this.group = group;
            heads = mixed ? List.of(new Head(staff, Shape.NOTEHEAD_VOID, 3),
                                   new Head(staff, Shape.NOTEHEAD_BLACK, 0))
                          : List.of(new Head(staff, Shape.NOTEHEAD_BLACK, 0));
        }
        @Override public Staff getTopStaff() { return staff; }
        @Override public Staff getBottomStaff() { return staff; }
        @Override public List<Staff> getStaves() { return List.of(staff); }
        @Override public List<Inter> getMembers() { return heads; }
        @Override public StemInter getStem() { return stem; }
        @Override public List<AbstractBeamInter> getBeams() { return List.of(new BeamInter(1.0)); }
        @Override public BeamGroupInter getBeamGroup() { return group; }
    }

    private static class Graph extends SIGraph {
        Chord candidate;
        Graph(SystemInfo system) { super(system); }
        @Override public List<Inter> inters(Class type) { return List.of(candidate); }
        @Override public Relation getRelation(Inter source, Inter target, Class type) {
            return type == HeadStemRelation.class ? new HeadStemRelation() : null;
        }
        @Override public boolean addVertex(Inter inter) { throw new MutationAttempt(); }
    }

    private static class System extends SystemInfo {
        final Graph graph = new Graph(this);
        System() { super(1, null, null); }
        @Override public SIGraph getSig() { return graph; }
    }

    private static void check(boolean crossStaff) throws Exception {
        System system = new System();
        Staff first = new Staff();
        Group group = new Group();
        Chord candidate = new Chord(first, group, true);
        Chord neighbor = new Chord(crossStaff ? new Staff() : first, group, false);
        group.chords = List.of(candidate, neighbor);
        system.graph.candidate = candidate;
        Method split = SymbolsLinker.class.getDeclaredMethod("splitSharedStemChords");
        split.setAccessible(true);
        boolean mutated = false;
        try {
            split.invoke(new SymbolsLinker(system));
        } catch (InvocationTargetException ex) {
            if (ex.getCause() instanceof MutationAttempt) {
                mutated = true;
            } else {
                throw ex;
            }
        }
        if (mutated == crossStaff) {
            throw new AssertionError(crossStaff ? "cross-staff group was split"
                                               : "same-staff positive control did not reach the split");
        }
    }

    public static void main(String[] args) throws Exception {
        check(true);
        check(false);
        java.lang.System.out.println("cross-staff abstention and same-staff control OK");
    }
}
