import ij.process.ByteProcessor;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.lang.reflect.Constructor;
import java.nio.file.Path;
import org.audiveris.omr.glyph.Glyph;
import org.audiveris.omr.run.*;
import org.audiveris.omr.sheet.*;
import org.audiveris.omr.sig.inter.*;
import org.audiveris.omr.util.HorizontalSide;

/** Exercise the actual SYMBOLS eraser with synthetic ink and a contaminated curve glyph. */
public class SlurDotErasureFixture {
    static class Curve extends SlurInter {
        final HeadInter head;
        final Glyph pixels;
        Curve(Glyph glyph, HeadInter head) {
            super(false, 1.0);
            this.pixels = glyph;
            this.head = head;
        }
        @Override public Glyph getGlyph() { return pixels; }
        @Override public HeadInter getHead(HorizontalSide side) {
            return side == HorizontalSide.LEFT ? head : null;
        }
    }

    private static void check(String scenario, int il) throws Exception {
        Book book = new Book(Path.of("synthetic.png"));
        Sheet sheet = new Sheet(new SheetStub(book, 1), (RunTable) null);
        sheet.setScale(new Scale(new Scale.InterlineScale(il-1,il,il+1),
                new Scale.LineScale(2,3,4), new Scale.BeamScale(il/2,false), null,null));
        int width=8*il, height=5*il;
        BufferedImage img = new BufferedImage(width,height,BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D ink = img.createGraphics();
        ink.setColor(Color.WHITE); ink.fillRect(0,0,width,height);
        ink.setColor(Color.BLACK);
        int x=2*il+4, y=2*il-il/5, dw=2*il/5, dh=dw+1;
        if(scenario.equals("far")) x+=2*il;
        if(scenario.equals("noise")) { dw=3; dh=3; }
        if(scenario.equals("elongated")) { dw=il; dh=4; }
        if(!scenario.equals("no-dot")) ink.fillOval(x,y,dw,dh);
        ink.fillRect(3*il, 5*il/2, 3*il, 3);
        if(scenario.equals("connected")) ink.drawLine(x+dw/2,y+dh/2,3*il,5*il/2);
        if(scenario.equals("staff")) ink.fillRect(il,y+dh/2,5*il,3);
        ByteProcessor buffer = new ByteProcessor(img);
        ByteProcessor before = (ByteProcessor) buffer.duplicate();
        // A slur glyph owns the right half of a dot even though the ink is disconnected.
        ByteProcessor mask = new ByteProcessor(width,height);
        mask.setValue(255); mask.fill();
        for(int py=0;py<height;py++) for(int px=0;px<width;px++)
            if(buffer.get(px,py)==0 && px>=x+dw/2
                    && (!scenario.equals("normal") || py>=5*il/2)) mask.set(px,py,0);
        Glyph glyph = new Glyph(0,0,new RunTableFactory(Orientation.VERTICAL).createTable(mask));
        HeadInter head = new HeadInter(new Rectangle(il-8,3*il/2,6*il/5,il),
                org.audiveris.omr.glyph.Shape.NOTEHEAD_BLACK,1.0,new Staff(),-1.0);
        Class<?> cleaner = Class.forName("org.audiveris.omr.sheet.symbol.SymbolsFilter$SymbolsCleaner");
        Constructor<?> ctor = cleaner.getDeclaredConstructor(ByteProcessor.class,Graphics2D.class,Sheet.class);
        ctor.setAccessible(true);
        PageCleaner eraser=(PageCleaner)ctor.newInstance(buffer,ink,sheet);
        Curve curve = new Curve(glyph,scenario.equals("unlinked") ? null : head);
        eraser.visit(curve);
        boolean preserve=scenario.equals("dot") || scenario.equals("normal");
        for(int py=0;py<height;py++) for(int px=0;px<width;px++) {
            boolean dot=px>=x && px<x+dw && py>=y && py<y+dh;
            int expected=mask.get(px,py)==0 && !(preserve && dot) ? 255 : before.get(px,py);
            if(buffer.get(px,py)!=expected)
                throw new AssertionError(scenario+" IL"+il+" pixel "+px+","+py
                        +" expected "+expected+" got "+buffer.get(px,py));
        }
        if(curve.getGlyph()!=glyph) throw new AssertionError("curve glyph changed");
        // A second erasure must have the same pixels, and must restore the caller's clip.
        java.awt.Shape clip=ink.getClip();
        eraser.visit(curve);
        if(ink.getClip()!=clip && !(ink.getClip()==null && clip==null))
            throw new AssertionError("caller clip changed");
        ink.dispose();
    }

    public static void main(String[] args) throws Exception {
        String[] cases=args.length==0 ? new String[]{"dot","normal","no-dot","connected",
                "staff","noise","elongated","unlinked","far"} : args;
        for(String scenario:cases) for(int il:new int[]{16,20,24}) check(scenario,il);
        java.lang.System.out.println("slur dot erasure cases OK: "+String.join(",",cases));
    }
}
