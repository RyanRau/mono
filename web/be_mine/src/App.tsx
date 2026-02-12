import React, { useState, useEffect, useCallback } from "react";

const SAYINGS = [
  "I ruff you more than belly rubs!",
  "You had me at woof.",
  "I'm mutts about you!",
  "You're pawsitively irresistible!",
  "Will you be my fur-ever valentine?",
  "I labra-dore you!",
  "You make my tail wag!",
  "I'm not paw-king around, be mine!",
  "You're the golden standard of valentines.",
  "I fetched you this valentine!",
  "I dig you more than my favorite bone.",
  "You make me howl with joy!",
  "No need to retriever love elsewhere, I'm right here!",
  "You're un-fur-gettable!",
  "Are you a dog park? Because I never want to leave you.",
  "Life without you would be ruff.",
  "I'm paws-itive you're the one for me!",
  "You've got me on a leash, valentine!",
  "Every day with you is a walk in the park.",
  "I'd never roll over on our love.",
];

function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function App() {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [nextImageUrl, setNextImageUrl] = useState<string | null>(null);
  const [saying, setSaying] = useState("");
  const [fading, setFading] = useState(false);
  const [sayingOrder, setSayingOrder] = useState<string[]>(() =>
    shuffle(SAYINGS)
  );
  const [sayingIndex, setSayingIndex] = useState(0);

  const fetchDogImage = useCallback(async (): Promise<string | null> => {
    try {
      const res = await fetch(
        "https://dog.ceo/api/breed/retriever/golden/images/random"
      );
      const data = await res.json();
      if (data.status === "success") {
        return data.message;
      }
    } catch {
      // silently fail, keep current image
    }
    return null;
  }, []);

  const preloadImage = useCallback((url: string): Promise<void> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = url;
    });
  }, []);

  const pickNextSaying = useCallback(() => {
    setSayingIndex((prev) => {
      const next = prev + 1;
      if (next >= sayingOrder.length) {
        setSayingOrder(shuffle(SAYINGS));
        return 0;
      }
      return next;
    });
  }, [sayingOrder.length]);

  // Set the saying whenever the index or order changes
  useEffect(() => {
    setSaying(sayingOrder[sayingIndex]);
  }, [sayingIndex, sayingOrder]);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const url = await fetchDogImage();
      if (!cancelled && url) {
        await preloadImage(url);
        setImageUrl(url);
      }
      // Pre-fetch the next one
      const next = await fetchDogImage();
      if (!cancelled && next) {
        await preloadImage(next);
        setNextImageUrl(next);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchDogImage, preloadImage]);

  // Cycle every 5 seconds
  useEffect(() => {
    if (!imageUrl) return;

    const interval = setInterval(async () => {
      setFading(true);

      setTimeout(async () => {
        // Use pre-fetched image if available, otherwise fetch new
        if (nextImageUrl) {
          setImageUrl(nextImageUrl);
          setNextImageUrl(null);
        } else {
          const url = await fetchDogImage();
          if (url) {
            await preloadImage(url);
            setImageUrl(url);
          }
        }
        pickNextSaying();
        setFading(false);

        // Pre-fetch the next image in the background
        const next = await fetchDogImage();
        if (next) {
          await preloadImage(next);
          setNextImageUrl(next);
        }
      }, 600);
    }, 5000);

    return () => clearInterval(interval);
  }, [imageUrl, nextImageUrl, fetchDogImage, preloadImage, pickNextSaying]);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.header}>Happy Valentine&apos;s Day!</div>
        <div style={styles.imageContainer}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt="A golden retriever"
              style={{
                ...styles.image,
                opacity: fading ? 0 : 1,
              }}
            />
          ) : (
            <div style={styles.loading}>Fetching a good boy...</div>
          )}
        </div>
        <div
          style={{
            ...styles.saying,
            opacity: fading ? 0 : 1,
          }}
        >
          {saying}
        </div>
        <div style={styles.footer}>Be Mine!</div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #fce4ec 0%, #f8bbd0 50%, #f48fb1 100%)",
    fontFamily: "'Georgia', 'Times New Roman', serif",
    margin: 0,
    padding: "20px",
    boxSizing: "border-box",
  },
  card: {
    background: "#fff",
    borderRadius: "24px",
    boxShadow: "0 8px 32px rgba(183, 28, 28, 0.2)",
    padding: "40px 36px",
    maxWidth: "480px",
    width: "100%",
    textAlign: "center" as const,
    border: "3px solid #e91e63",
    position: "relative" as const,
    overflow: "hidden",
  },
  header: {
    fontSize: "28px",
    fontWeight: "bold",
    color: "#c62828",
    marginBottom: "24px",
    letterSpacing: "0.5px",
  },
  imageContainer: {
    width: "100%",
    height: "340px",
    borderRadius: "16px",
    overflow: "hidden",
    marginBottom: "24px",
    backgroundColor: "#fce4ec",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
    objectFit: "cover" as const,
    transition: "opacity 0.6s ease-in-out",
  },
  loading: {
    color: "#e91e63",
    fontSize: "18px",
    fontStyle: "italic",
  },
  saying: {
    fontSize: "22px",
    color: "#ad1457",
    fontStyle: "italic",
    margin: "16px 0",
    minHeight: "60px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "opacity 0.6s ease-in-out",
    lineHeight: 1.4,
  },
  footer: {
    fontSize: "32px",
    fontWeight: "bold",
    color: "#e91e63",
    marginTop: "16px",
    letterSpacing: "1px",
  },
};

export default App;
