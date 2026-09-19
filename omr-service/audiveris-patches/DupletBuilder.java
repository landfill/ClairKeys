/* SPDX-License-Identifier: AGPL-3.0-or-later */
package org.audiveris.omr.sheet.symbol;

import ij.process.ByteProcessor;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.Rectangle;
import java.awt.RenderingHints;
import java.awt.font.TextLayout;
import java.awt.image.BufferedImage;
import java.util.ArrayList;
import java.util.List;
import java.util.Collection;
import org.audiveris.omr.sheet.rhythm.TupletsBuilder;
import org.audiveris.omr.sig.relation.Link;
import org.audiveris.omr.glyph.Glyph;
import org.audiveris.omr.glyph.Shape;
import org.audiveris.omr.math.Rational;
import org.audiveris.omr.run.Orientation;
import org.audiveris.omr.run.RunTableFactory;
import org.audiveris.omr.sheet.Picture;
import org.audiveris.omr.sheet.SystemInfo;
import org.audiveris.omr.sheet.rhythm.MeasureStack;
import org.audiveris.omr.sig.inter.*;
import org.audiveris.omr.ui.symbol.MusicFamily;
import org.audiveris.omr.ui.symbol.MusicFont;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Recover an explicitly printed duplet on a simple two-note beam, before rhythm. */
public final class DupletBuilder {
    private static final Logger logger = LoggerFactory.getLogger(DupletBuilder.class);
    private static final double MIN_SCORE = 0.82;
    private static final double MIN_MARGIN = 0.04;
    private final SystemInfo system;
    public DupletBuilder(SystemInfo system) { this.system = system; }

    public void build() {
        ByteProcessor pixels = null;
        for (Inter inter : new ArrayList<>(system.getSig().inters(BeamGroupInter.class))) {
            BeamGroupInter group = (BeamGroupInter) inter;
            List<AbstractChordInter> chords = group.getChords();
            if (group.getBeams().size() != 1 || chords.size() != 2) continue;
            AbstractChordInter first = chords.get(0), last = chords.get(1);
            if (!eligible(first, last) || first.getTuplet() != null || last.getTuplet() != null) continue;
            MeasureStack stack = first.getMeasure().getStack();
            AbstractTimeInter time = stack.getCurrentTimeSignature();
            if (time == null || !compound(time.getNumerator(), time.getDenominator())) continue;
            int il = first.getTopStaff().getSpecificInterline();
            Rectangle beam = group.getBounds();
            int cx = beam.x + beam.width / 2;
            boolean above = first.getStemDir() < 0;
            int y = above ? beam.y - 2 * il : beam.y + beam.height + il / 4;
            Rectangle area = new Rectangle(cx - il, y, 2 * il, 2 * il);
            // Numbers over heads/on staff are ambiguous with fingerings; inspect only the beam side.
            if (above ? area.y + area.height > first.getTopStaff().getFirstLine().yAt(cx)
                    : area.y < first.getBottomStaff().getLastLine().yAt(cx)) continue;
            if (pixels == null) pixels = system.getSheet().getPicture().getSource(Picture.SourceKey.BINARY);
            if (pixels == null) return;
            Match match = match(pixels, area, il);
            if (match == null) continue;
            boolean occupied = false;
            for (Inter tuplet : system.getSig().inters(TupletInter.class))
                if (tuplet.getBounds().intersects(area)) { occupied = true; break; }
            if (occupied) continue;
            Rectangle box = match.bounds;
            ByteProcessor ink = new ByteProcessor(box.width, box.height);
            for (int py = 0; py < box.height; py++) for (int px = 0; px < box.width; px++)
                ink.set(px, py, pixels.get(box.x + px, box.y + py));
            Glyph glyph = new Glyph(box.x, box.y,
                    new RunTableFactory(Orientation.VERTICAL).createTable(ink));
            glyph = system.getSheet().getGlyphIndex().registerOriginal(glyph);
            TupletInter tuplet = new TupletInter(glyph, Shape.TUPLET_TWO, match.score);
            system.getSig().addVertex(tuplet);
            Collection<Link> links = new TupletsBuilder(stack).lookupLinks(tuplet);
            if (links.size() != 2 || links.stream().anyMatch(link -> !chords.contains(link.partner))) {
                tuplet.remove();
                continue;
            }
            links.forEach(link -> link.applyTo(tuplet));
            logger.info("Duplet {} beam {} score {} margin {}", tuplet, group.getId(),
                    match.score, match.margin);
        }
    }

    public static boolean compound(int numerator, int denominator) {
        return denominator == 8 && numerator >= 6 && numerator % 3 == 0;
    }

    private static boolean eligible(AbstractChordInter a, AbstractChordInter b) {
        return !(a instanceof SmallChordInter) && !(b instanceof SmallChordInter)
                && a.getTopStaff() != null && a.getMeasure() != null && a.getMeasure() == b.getMeasure()
                && a.getTopStaff() == a.getBottomStaff() && a.getTopStaff() == b.getTopStaff()
                && b.getTopStaff() == b.getBottomStaff() && a.getStemDir() != 0
                && a.getStemDir() == b.getStemDir() && a.getDotsNumber() == 0 && b.getDotsNumber() == 0
                && new Rational(1, 8).equals(a.getDurationSansDotOrTuplet())
                && new Rational(1, 8).equals(b.getDurationSansDotOrTuplet());
    }

    public static final class Match {
        public final Rectangle bounds;
        public final double score, margin;
        Match(Rectangle bounds, double score, double margin) {
            this.bounds = bounds; this.score = score; this.margin = margin;
        }
    }

    /** Compete all ten digits on identical visible pixels; long crossing strokes are unscored. */
    public static Match match(ByteProcessor pixels, Rectangle area, int il) {
        int reach = Math.max(2, (int) Math.round(1.2 * il));
        if (il < 8 || area.width > 62 || area.x - reach < 0 || area.y < 0
                || area.x + area.width + reach >= pixels.getWidth()
                || area.y + area.height >= pixels.getHeight()) return null;
        long[] ink = new long[area.height], visible = new long[area.height];
        java.util.Arrays.fill(visible, (1L << area.width) - 1);
        int visibleInk = 0;
        for (int x = 0; x < area.width; x++) {
            int px = area.x + x;
            List<int[]> left = runs(pixels, px - reach, area.y, area.height);
            List<int[]> right = runs(pixels, px + reach, area.y, area.height);
            for (int[] l : left) for (int[] r : right) {
                int lh = l[1] - l[0], rh = r[1] - r[0];
                if (Math.abs(l[0] + l[1] - r[0] - r[1]) > il
                        || Math.max(lh, rh) > il / 2 || Math.abs(lh - rh) > il / 5) continue;
                // Interpolate the crossing stroke itself, rather than masking its entire vicinity.
                int top = Math.max(0, (l[0] + r[0]) / 2);
                int bottom = Math.min(area.height, (l[1] + r[1] + 1) / 2);
                for (int y = top; y < bottom; y++) visible[y] &= ~(1L << x);
            }
        }
        for (int y = 0; y < area.height; y++) for (int x = 0; x < area.width; x++) {
            long bit = 1L << x;
            if (pixels.get(area.x + x, area.y + y) < 128) {
                ink[y] |= bit;
                if ((visible[y] & bit) != 0) visibleInk++;
            }
        }
        if (visibleInk < .08 * il * il) return null;
        double[] scores = new double[10];
        Rectangle[] boxes = new Rectangle[10];
        for (int digit = 0; digit < 10; digit++) {
            for (MusicFamily family : new MusicFamily[]{MusicFamily.Leland, null}) {
                BufferedImage source = render(digit, il, family);
                for (int h = (int) Math.round(1.15 * il); h <= Math.round(1.55 * il); h++)
                    for (int w = (int) Math.round(.7 * il); w <= Math.round(1.2 * il); w++) {
                        long[] template = resize(source, w, h);
                        int total = 0;
                        for (long row : template) total += Long.bitCount(row);
                        long widthMask = (1L << w) - 1;
                        for (int y = 0; y + h <= area.height; y++)
                            for (int x = Math.max(0, (area.width - w) / 2 - il / 3);
                                    x <= Math.min(area.width - w, (area.width - w) / 2 + il / 3); x++) {
                                int actual = visibleInk, expected = 0, common = 0, nearActual = 0, nearExpected = 0;
                                for (int row = 0; row < h; row++) {
                                    long mask = (visible[y + row] >>> x) & widthMask;
                                    long a = (ink[y + row] >>> x) & mask;
                                    long t = template[row] & mask;
                                    expected += Long.bitCount(t);
                                    common += Long.bitCount(a & t);
                                    long td = template[row] | (template[row] << 1) | (template[row] >>> 1);
                                    if (row > 0) td |= template[row - 1];
                                    if (row + 1 < h) td |= template[row + 1];
                                    long rowInk = ink[y + row] & visible[y + row];
                                    long ad = rowInk | (rowInk << 1) | (rowInk >>> 1);
                                    if (y + row > 0) ad |= ink[y + row - 1] & visible[y + row - 1];
                                    if (y + row + 1 < area.height) ad |= ink[y + row + 1] & visible[y + row + 1];
                                    nearActual += Long.bitCount(a & td);
                                    nearExpected += Long.bitCount(t & (ad >>> x));
                                }
                                if (expected < .55 * total || actual + expected == 0) continue;
                                double score = (common + .5 * (nearActual + nearExpected)) / (actual + expected);
                                if (score > scores[digit]) {
                                    scores[digit] = score;
                                    boxes[digit] = new Rectangle(area.x + x, area.y + y, w, h);
                                }
                            }
                    }
            }
        }
        double competitor = 0;
        for (int d = 0; d < 10; d++) if (d != 2) competitor = Math.max(competitor, scores[d]);
        logger.debug("Duplet template {} scores {} boxes {}", area, java.util.Arrays.toString(scores), java.util.Arrays.toString(boxes));
        if (scores[2] < MIN_SCORE || scores[2] - competitor < MIN_MARGIN) return null;
        return new Match(boxes[2], scores[2], scores[2] - competitor);
    }

    private static List<int[]> runs(ByteProcessor pixels, int x, int y, int height) {
        List<int[]> found = new ArrayList<>();
        int start = -1;
        for (int row = 0; row <= height; row++) {
            boolean black = row < height && pixels.get(x, y + row) < 128;
            if (black && start < 0) start = row;
            if (!black && start >= 0) { found.add(new int[]{start, row}); start = -1; }
        }
        return found;
    }

    private static BufferedImage render(int digit, int il, MusicFamily family) {
        TextLayout layout = family == null
                ? new TextLayout(Integer.toString(digit), new java.awt.Font("DejaVu Sans", java.awt.Font.ITALIC, 4 * il),
                        new java.awt.font.FontRenderContext(null, false, false))
                : MusicFont.getBaseFont(family, il)
                        .layout(Character.toString((family == MusicFamily.Primus ? 0xf048 : 0xe880) + digit));
        Rectangle bounds = layout.getBounds().getBounds();
        BufferedImage image = new BufferedImage(bounds.width, bounds.height, BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g = image.createGraphics();
        g.setColor(Color.WHITE); g.fillRect(0, 0, bounds.width, bounds.height);
        g.setColor(Color.BLACK); layout.draw(g, -bounds.x, -bounds.y); g.dispose();
        return image;
    }

    private static long[] resize(BufferedImage source, int w, int h) {
        BufferedImage image = new BufferedImage(w, h, BufferedImage.TYPE_BYTE_GRAY);
        Graphics2D g = image.createGraphics();
        g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
        g.drawImage(source, 0, 0, w, h, null); g.dispose();
        long[] rows = new long[h];
        for (int y = 0; y < h; y++) for (int x = 0; x < w; x++)
            if (image.getRaster().getSample(x, y, 0) < 128) rows[y] |= 1L << x;
        return rows;
    }
}
