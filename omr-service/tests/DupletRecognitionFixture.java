import ij.process.ByteProcessor;
import java.awt.*;
import java.awt.font.TextLayout;
import java.awt.image.BufferedImage;
import java.lang.reflect.Method;
import org.audiveris.omr.ui.symbol.MusicFamily;
import org.audiveris.omr.ui.symbol.MusicFont;

/** Printed-digit discrimination with independent placement and crossing-stroke controls. */
public class DupletRecognitionFixture {
    private static Method matcher;
    private static int cases;
    private static boolean sans;
    private static void check(int il, int digit, String crossing) throws Exception {
        int width=8*il, height=6*il;
        BufferedImage image=new BufferedImage(width,height,BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g=image.createGraphics();g.setColor(Color.WHITE);g.fillRect(0,0,width,height);
        Rectangle area=new Rectangle(3*il,2*il,2*il,2*il);
        int w=(int)Math.round(.9*il), h=(int)Math.round(1.35*il);
        int x=4*il-w/2, y=2*il+il/4;
        if(crossing.equals("finger")) x+=2*il;
        if(digit>=0) {
            java.awt.Font font=new java.awt.Font("DejaVu Sans",java.awt.Font.ITALIC,4*il);
            if(sans && !font.getFamily().equals("DejaVu Sans")) throw new AssertionError("required DejaVu font missing");
            TextLayout layout=sans ? new TextLayout(Integer.toString(digit),font,
                    new java.awt.font.FontRenderContext(null,false,false))
                    : MusicFont.getBaseFont(MusicFamily.Leland,il).layout(Character.toString(0xe880+digit));
            Rectangle b=layout.getBounds().getBounds();
            BufferedImage glyph=new BufferedImage(b.width,b.height,BufferedImage.TYPE_BYTE_GRAY);
            Graphics2D gg=glyph.createGraphics();gg.setColor(Color.WHITE);gg.fillRect(0,0,b.width,b.height);
            gg.setColor(Color.BLACK);layout.draw(gg,-b.x,-b.y);gg.dispose();
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g.drawImage(glyph,x,y,w,h,null);
        }
        g.setColor(Color.BLACK);
        if(crossing.equals("upper") || crossing.equals("lower") || crossing.equals("hidden")) {
            int cy=y+(crossing.equals("upper") ? h/5 : crossing.equals("lower") ? 4*h/5 : h/4);
            g.fillRect(il,cy,6*il,crossing.equals("hidden") ? h*3/4 : Math.max(2,il/5));
        }
        if(crossing.equals("noise")) {g.fillRect(x,y,3,3);g.fillRect(x+il/2,y+il/2,2,2);}
        g.dispose();
        Object found=matcher.invoke(null,new ByteProcessor(image),area,il);
        boolean expected=digit==2 && !crossing.equals("finger") && !crossing.equals("hidden");
        if((found!=null)!=expected) throw new AssertionError("digit="+digit+" IL="+il+" "+crossing+" expected="+expected+" found="+found);
        cases++;
    }
    private static class Chord extends org.audiveris.omr.sig.inter.HeadChordInter {
        org.audiveris.omr.sheet.Staff top, bottom;
        org.audiveris.omr.sheet.rhythm.Measure measure;
        int dots, direction=-1;
        org.audiveris.omr.math.Rational duration=new org.audiveris.omr.math.Rational(1,8);
        Chord(org.audiveris.omr.sheet.Staff staff, org.audiveris.omr.sheet.rhythm.Measure measure) {
            super(1.0); top=bottom=staff; this.measure=measure;
        }
        @Override public org.audiveris.omr.sheet.Staff getTopStaff(){return top;}
        @Override public org.audiveris.omr.sheet.Staff getBottomStaff(){return bottom;}
        @Override public org.audiveris.omr.sheet.rhythm.Measure getMeasure(){return measure;}
        @Override public int getDotsNumber(){return dots;}
        @Override public int getStemDir(){return direction;}
        @Override public org.audiveris.omr.math.Rational getDurationSansDotOrTuplet(){return duration;}
    }
    private static void geometry(Class<?> builder) throws Exception {
        Method eligible=builder.getDeclaredMethod("eligible",
                org.audiveris.omr.sig.inter.AbstractChordInter.class,
                org.audiveris.omr.sig.inter.AbstractChordInter.class);
        eligible.setAccessible(true);
        for(String scenario:new String[]{"up","down","cross-staff","two-staves","dots","quarter",
                "different-measure","no-measure","opposite","no-stem","no-staff"}) {
            org.audiveris.omr.sheet.Staff staff=new org.audiveris.omr.sheet.Staff();
            org.audiveris.omr.sheet.rhythm.Measure measure=new org.audiveris.omr.sheet.rhythm.Measure(null);
            Chord a=new Chord(staff,measure),b=new Chord(staff,measure);
            switch(scenario){
                case "down":a.direction=b.direction=1;break;
                case "cross-staff":b.top=b.bottom=new org.audiveris.omr.sheet.Staff();break;
                case "two-staves":b.bottom=new org.audiveris.omr.sheet.Staff();break;
                case "dots":b.dots=1;break;
                case "quarter":b.duration=new org.audiveris.omr.math.Rational(1,4);break;
                case "different-measure":b.measure=new org.audiveris.omr.sheet.rhythm.Measure(null);break;
                case "no-measure":a.measure=b.measure=null;break;
                case "opposite":b.direction=1;break;
                case "no-stem":a.direction=b.direction=0;break;
                case "no-staff":a.top=a.bottom=b.top=b.bottom=null;break;
                default:break;
            }
            boolean expected=scenario.equals("up")||scenario.equals("down");
            if(!eligible.invoke(null,a,b).equals(expected))throw new AssertionError(scenario);
        }
    }
    public static void main(String[] args) throws Exception {
        Class<?> builder=Class.forName("org.audiveris.omr.sheet.symbol.DupletBuilder");
        geometry(builder);
        matcher=builder.getMethod("match",ByteProcessor.class,Rectangle.class,int.class);
        Method compound=builder.getMethod("compound",int.class,int.class);
        for(int numerator:new int[]{2,3,4,5,6,7,9,12}) for(int denominator:new int[]{4,8,16}) {
            boolean expected=java.util.Set.of("6/8","9/8","12/8").contains(numerator+"/"+denominator);
            if(!compound.invoke(null,numerator,denominator).equals(expected)) throw new AssertionError("meter");
        }
        for(boolean useSans:new boolean[]{false,true}) {
        sans=useSans;
        for(int il:new int[]{16,20,24}) {
            for(int digit=0;digit<=9;digit++) for(String crossing:new String[]{"none","upper","lower"}) check(il,digit,crossing);
            check(il,2,"finger"); check(il,2,"hidden");check(il,-1,"upper");check(il,-1,"noise");
        }
        }
        System.out.println("duplet recognition cases OK: "+cases+" +24 meter +11 geometry controls");
    }
}
