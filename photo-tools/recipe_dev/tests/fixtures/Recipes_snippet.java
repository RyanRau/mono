    public static final int STD = 1, VIVID = 2, NEUTRAL = 3, PORTRAIT = 4, LANDSCAPE = 5, MONO = 6, CLEAR = 7, DEEP = 8, LIGHT = 9, SUNSET = 10, NIGHT = 11, AUTUMN = 12, SEPIA = 14;
    private static final int AUTO = 1, K = 14;
    public static final int DRO_OFF = 0, DRO_AUTO = 6;
    public static final String[] GROUPS = { "Sony", "Fuji Sim", "Fuji Film", "Kodak", "Cine", "Ricoh GR", "Leica", "Hasselblad", "Canon / Nikon", "Pana / Olympus", "Other Stocks", "Ilford" };
    private static final int SONY = 0, FSIM = 1, FFILM = 2, KODAK = 3, CINE = 4, RICOH = 5, LEICA = 6, HASSEL = 7, CANIK = 8, PANOLY = 9, OTHER = 10, ILFORD = 11;

    public static final Recipe[] ALL = {
        // ---- Sony (Creative Looks from newer bodies — same pipeline, best fidelity)
        new Recipe(SONY,  "FACTORY (ST)",                        STD,      0,  0,  0, AUTO, 0,     0,  0),
        new Recipe(SONY,  "Sony SH (soft high-key)",             LIGHT,   -2, -2,  0, AUTO, 0,     1,  0,  5,  3, 6),
        new Recipe(FSIM,  "Classic Chrome",                      STD,     -1,  2,  0, AUTO, 0,     3,  1,  0, -1, 6),   // golden with muted blues; Neutral -3 A2 came out grey-beige
        new Recipe(FSIM,  "Eterna Bleach Bypass",                NEUTRAL, -3,  3,  0, AUTO, 0,     0,  0,  0, -1, DRO_OFF),   // the store keeps sat -3 at most, so DRO off carries the rest
        new Recipe(CINE,  "Cinestill 800T",                      NEUTRAL,  0,  0,  0, K,    3200,  0, -1,  0,  1, 6),
    };
