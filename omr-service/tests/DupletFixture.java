import java.lang.reflect.Method;
import org.audiveris.omr.glyph.Shape;
import org.audiveris.omr.sheet.DurationFactor;
import org.audiveris.omr.sig.inter.TupletInter;
import org.audiveris.omr.sig.relation.ChordTupletRelation;

/** Native regression: a duplet lengthens two written notes to three base units. */
public class DupletFixture {
    public static void main(String[] args) throws Exception {
        Shape two = Shape.valueOf("TUPLET_TWO");
        if (two.ordinal() <= Shape.LAST_PHYSICAL_SHAPE.ordinal()) throw new AssertionError("must not change trained physical labels");
        DurationFactor factor = new TupletInter(null, two, 1.0).getDurationFactor();
        if (factor == null || factor.num != 3 || factor.den != 2)
            throw new AssertionError("duplet must apply 3/2");
        new ChordTupletRelation(two);
        Method count = Class.forName("org.audiveris.omr.sheet.rhythm.TupletsBuilder")
                .getDeclaredMethod("expectedCount", Shape.class);
        count.setAccessible(true);
        if ((Integer) count.invoke(null, two) != 2) throw new AssertionError("two base items");
        for (Shape shape : new Shape[]{Shape.TUPLET_THREE, Shape.TUPLET_SIX}) {
            DurationFactor old = new TupletInter(null, shape, 1.0).getDurationFactor();
            int denominator = shape == Shape.TUPLET_THREE ? 3 : 6;
            if (old.actualNum != denominator * 2 / 3 || old.actualDen != denominator)
                throw new AssertionError("existing tuplet changed");
        }
        System.out.println("duplet factor cases OK");
    }
}
