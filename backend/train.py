"""
TrueNova AI — Multi-Dataset Model Training
===========================================
Downloads and combines FOUR major fake news datasets:

  1. WELFake        — 72,134 articles  (Kaggle / HuggingFace GonzaloA)
  2. LIAR            — 12,836 political fact-checked statements
  3. FakeNewsNet     — PolitiFact + GossipCop articles
  4. COVID FakeNews  — pandemic misinformation dataset
  + Built-in curated examples as final fallback

Combined size: up to ~90,000 examples
Expected accuracy: 95–98 %

Run once:
    python train.py
"""

import os
import sys
import re
import pickle
import random
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report


# ─────────────────────────────────────────────
# Text cleaning
# ─────────────────────────────────────────────

def clean_text(text: str) -> str:
    text = str(text).lower()
    text = re.sub(r"http\S+|www\S+|https\S+", " ", text)
    text = re.sub(r"[^a-zA-Z\s]", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


# ─────────────────────────────────────────────
# Dataset 1: WELFake  (primary, ~40K after split)
# ─────────────────────────────────────────────

def load_wellfake() -> tuple[list, list]:
    print("\n[1/4] WELFake dataset (GonzaloA/fake_news) ...")
    from datasets import load_dataset
    ds = load_dataset("GonzaloA/fake_news")

    texts, labels = [], []
    for split in ("train", "test", "validation"):
        if split not in ds:
            continue
        for item in ds[split]:
            title = str(item.get("title") or "")
            body  = str(item.get("text")  or "")
            t = clean_text(title + " " + body)
            if len(t) > 20:
                texts.append(t)
                labels.append(int(item["label"]))  # 0=FAKE, 1=REAL

    print(f"    Loaded {len(texts):,} articles (FAKE={sum(1 for l in labels if l==0):,}, REAL={sum(1 for l in labels if l==1):,})")
    return texts, labels


# ─────────────────────────────────────────────
# Dataset 2: LIAR  (~12K political statements)
# ─────────────────────────────────────────────

def load_liar() -> tuple[list, list]:
    print("\n[2/4] LIAR dataset (political fact-checks) ...")
    from datasets import load_dataset
    ds = load_dataset("liar")

    # 6-class → binary:  pants-fire/false/barely-true = FAKE,
    #                     half-true/mostly-true/true   = REAL
    label_map = {
        "pants-fire":  0, "false": 0, "barely-true": 0,
        "half-true":   1, "mostly-true": 1, "true": 1,
    }

    texts, labels = [], []
    for split in ("train", "test", "validation"):
        if split not in ds:
            continue
        for item in ds[split]:
            stmt  = clean_text(str(item.get("statement") or ""))
            lbl   = str(item.get("label", ""))
            speaker = clean_text(str(item.get("speaker") or ""))
            subject = clean_text(str(item.get("subject") or ""))
            if stmt and lbl in label_map:
                combined = f"{stmt} {speaker} {subject}".strip()
                texts.append(combined)
                labels.append(label_map[lbl])

    print(f"    Loaded {len(texts):,} statements (FAKE={sum(1 for l in labels if l==0):,}, REAL={sum(1 for l in labels if l==1):,})")
    return texts, labels


# ─────────────────────────────────────────────
# Dataset 3: FakeNewsNet  (PolitiFact + GossipCop)
# ─────────────────────────────────────────────

def load_fakenewsnet() -> tuple[list, list]:
    print("\n[3/4] FakeNewsNet (mrm8488/fake-news) ...")
    from datasets import load_dataset

    # Try multiple HuggingFace mirrors of FakeNewsNet
    for repo in ("mrm8488/fake-news", "fakenewsnet"):
        try:
            ds = load_dataset(repo)
            texts, labels = [], []
            split = "train" if "train" in ds else list(ds.keys())[0]
            for item in ds[split]:
                title = str(item.get("title") or item.get("news_title") or "")
                body  = str(item.get("text")  or item.get("news_body")  or "")
                t = clean_text(title + " " + body)
                lbl = item.get("label", item.get("real", -1))
                if len(t) > 20 and lbl in (0, 1):
                    texts.append(t)
                    labels.append(int(lbl))
            if texts:
                print(f"    Loaded {len(texts):,} articles from {repo}")
                return texts, labels
        except Exception as e:
            print(f"    {repo} failed: {e}")

    print("    FakeNewsNet unavailable — skipping.")
    return [], []


# ─────────────────────────────────────────────
# Dataset 4: COVID Fake News
# ─────────────────────────────────────────────

def load_covid_fake() -> tuple[list, list]:
    print("\n[4/4] COVID Fake News dataset ...")
    from datasets import load_dataset

    for repo in ("nanyy1108/fake_news_detection", "covid_fake_news", "Cartinoe5930/FakeNewsDetection"):
        try:
            ds = load_dataset(repo)
            texts, labels = [], []
            split = "train" if "train" in ds else list(ds.keys())[0]
            for item in ds[split]:
                text = str(
                    item.get("text") or item.get("statement") or
                    item.get("title") or item.get("news") or ""
                )
                t = clean_text(text)
                lbl = item.get("label", -1)
                if isinstance(lbl, str):
                    lbl = 0 if lbl.lower() in ("fake", "false", "0") else 1
                if len(t) > 10 and lbl in (0, 1):
                    texts.append(t)
                    labels.append(int(lbl))
            if texts:
                print(f"    Loaded {len(texts):,} examples from {repo}")
                return texts, labels
        except Exception as e:
            print(f"    {repo} failed: {e}")

    print("    COVID dataset unavailable — skipping.")
    return [], []


# ─────────────────────────────────────────────
# Built-in fallback dataset
# ─────────────────────────────────────────────

def builtin_dataset() -> tuple[list, list]:
    print("\nUsing built-in dataset (no internet) ...")

    real = [
        "The Federal Reserve raised interest rates by 0.25 percentage points on Wednesday citing continued strength in the labor market and inflation that remains above its 2 percent target. Fed Chair Jerome Powell said the central bank remains committed to returning inflation to its 2 percent target.",
        "Scientists at NASA confirmed the discovery of water ice deposits near the Moon south pole using data from the Lunar Reconnaissance Orbiter. The findings published in the Proceedings of the National Academy of Sciences suggest potential in-situ resources for future crewed lunar missions.",
        "Apple Inc reported quarterly earnings of 1.52 dollars per share beating analyst expectations of 1.43 dollars. Revenue rose 8 percent year-over-year to 94.8 billion dollars driven by strong iPhone sales and growing services segment revenue according to the company earnings report.",
        "A new study published in the New England Journal of Medicine found that a vaccine candidate showed 94 percent efficacy against severe disease in Phase 3 clinical trials involving 40000 participants across 15 countries.",
        "The United Nations Security Council voted 13 to 2 in favor of extending the humanitarian aid corridor in northern Syria for another six months with Russia and China abstaining from the final vote.",
        "Researchers at MIT have developed a new class of solar cells achieving 47 percent conversion efficiency a record surpassing previous benchmarks. The breakthrough uses a tandem cell design combining perovskite layers with traditional silicon substrates.",
        "The World Health Organization declared the end of the Ebola outbreak in the Democratic Republic of Congo after 42 consecutive days with no new confirmed cases following a vaccination campaign that reached over 350000 people.",
        "Congress passed a bipartisan infrastructure investment bill with a final vote of 228 to 206 allocating 1.2 trillion dollars for roads bridges broadband internet expansion and clean energy transition projects over the next decade.",
        "Googles parent company Alphabet announced plans to invest 7 billion dollars in new office facilities and data centers across the United States creating approximately 10000 full-time jobs in 19 states.",
        "The European Central Bank raised its key benchmark interest rate by 50 basis points to combat inflation that reached 10.7 percent across the eurozone the highest recorded level since the single currency was introduced in 1999.",
        "Astronomers using the James Webb Space Telescope have detected carbon dioxide in the atmosphere of exoplanet WASP-39b located 700 light-years away marking the first definitive detection of CO2 in an exoplanet atmosphere according to a study published in Nature.",
        "The International Olympic Committee confirmed that Paris will host the 2024 Summer Olympics with an expected attendance of over 3 million visitors. The opening ceremony is scheduled for the Seine River on July 26.",
        "Global carbon dioxide emissions reached a record 36.8 billion tonnes in 2023 according to the Global Carbon Project. The report notes that renewable energy growth is not yet offsetting fossil fuel consumption at the rate needed to meet Paris Agreement targets.",
        "The pharmaceutical company Pfizer announced positive Phase 3 trial results for its experimental cancer immunotherapy showing a 38 percent reduction in tumor progression compared to standard chemotherapy in patients with non-small cell lung cancer.",
        "SpaceX successfully launched the Starship spacecraft on its third integrated flight test reaching an altitude of approximately 210 kilometers before executing a controlled reentry over the Indian Ocean according to company officials.",
        "A landmark climate agreement signed by 130 nations at COP28 in Dubai commits signatories to tripling renewable energy capacity and doubling energy efficiency improvements by 2030 compared to 2020 baseline levels.",
        "The unemployment rate in the United States fell to 3.7 percent in November with the economy adding 199000 non-farm payroll jobs according to data released by the Bureau of Labor Statistics on Friday.",
        "Oxford University researchers published evidence in Science that a newly developed mRNA vaccine provides broad protection against multiple strains of influenza reducing hospitalization risk by 67 percent in trials across eight countries.",
        "Microsoft reported net income of 22.3 billion dollars for the fiscal first quarter a 27 percent increase year-over-year driven by cloud computing services revenue which grew 29 percent to 24.1 billion dollars.",
        "The World Bank approved a 2.5 billion dollar loan to support infrastructure development in South Asia with a focus on clean energy access and digital connectivity for rural communities across the region.",
        "A comprehensive study published in The Lancet found that air pollution contributed to 6.7 million premature deaths globally in 2021 with low and middle-income countries bearing the greatest burden according to researchers.",
        "The European Union has agreed to a landmark deal requiring all new cars sold after 2035 to produce zero carbon emissions effectively ending the sale of new petrol and diesel vehicles across the bloc.",
        "Researchers from Stanford University and the National Institutes of Health have identified a new mechanism by which certain gut bacteria protect against colorectal cancer according to a paper published in Cell.",
        "The International Monetary Fund raised its global growth forecast to 3.2 percent for this year citing stronger than expected performance in the United States and emerging market economies according to its latest World Economic Outlook.",
    ]

    fake = [
        "SHOCKING scientists REFUSE to reveal what they really found on Mars the government is hiding EVERYTHING from us share this before it gets DELETED forever!!!",
        "BREAKING doctors dont want you to know about this miracle cure that BIG PHARMA is suppressing it cures everything in 3 days share with everyone you know RIGHT NOW before they take this down!!!",
        "The TRUTH about 5G towers finally EXPOSED they are using them to control your mind and inject invisible nanobots through your phone signal WAKE UP SHEEPLE the elite dont want you knowing this!!!",
        "ALERT the real reason they dont want you drinking tap water REVEALED they are secretly adding chemicals to make entire populations INFERTILE and STUPID share before censored by the deep state!!!",
        "BOMBSHELL celebrity caught doing something SO DISGUSTING that Hollywood and the mainstream media are desperately trying to hide it click NOW to see the photo they banned everywhere!!!",
        "Scientists ADMIT they were WRONG about everything the Earth is actually hollow and an advanced alien civilization lives inside your government has secretly known this for over 50 years!!!",
        "URGENT new law will allow government agents to enter your home WITHOUT a warrant or notice starting next month share this to warn your family and friends before it is too late!!!",
        "The SECRET ingredient in fast food that causes permanent BRAIN DAMAGE in children a retired chemist bravely EXPOSES the conspiracy share NOW before Big Food makes this disappear forever!!!",
        "PROOF the moon landing was faked in a secret Hollywood studio we have the original classified documents they tried to burn watch and share this video before YouTube removes it again!!!",
        "EXPOSED how globalist billionaires are using vaccines to secretly microchip the entire global population for total surveillance and mind control the plan launches THIS YEAR tell everyone!!!",
        "THEY ARE LYING TO YOU about what is really causing cancer it is not genetics it is the fluoride in the water and the chemtrails sprayed from aircraft every single day wake up to the truth!!!",
        "A DOCTOR was fired for revealing this simple 2-dollar grocery store item cures diabetes permanently Big Pharma threatened to destroy his career share this life-saving information now!!!",
        "BREAKING the mainstream media is completely silent about what just happened at Area 51 because they signed secret agreements to hide alien contact from the public in 1947 and still today!!!",
        "She posted ONE video exposing the truth about vaccinations and Facebook banned her account within HOURS they are TERRIFIED of the truth getting out SHARE EVERYWHERE before censored!!!",
        "SHOCKING study reveals that eating chocolate every day MELTS belly fat and reverses aging by 20 years doctors have hidden this discovery because it would destroy the diet industry!!!",
        "The REAL reason the government wants you to use electric cars is to track your location 24 hours a day through GPS chips mandatory in all new vehicles share this bombshell revelation!!!",
        "EXPOSED how the WHO and CDC are deliberately engineering new viruses in secret laboratories to create pandemics and force the global population to take control vaccines for total domination!!!",
        "This ONE weird household item kills 100 percent of cancer cells overnight that your oncologist will NEVER tell you about because hospitals make billions keeping you sick and dependent!!!",
        "CONFIRMED a secret society of elites meets twice a year to decide which world leaders get elected and which economies get crashed they control EVERYTHING and nobody is allowed to talk about it!!!",
        "Breaking news the sun is actually going to explode in 2026 and governments worldwide have built underground bunkers for the elites while keeping the rest of us in the dark about our fate!!!",
        "MUST SHARE scientists discover the COVID vaccine contains graphene oxide that connects to 5G networks and can control your behavior through your smartphone this is not a conspiracy it is a FACT!!!",
        "They DELETED this video three times but we keep reposting it the evidence that the election was stolen is overwhelming and the mainstream media refuses to report on it SHARE NOW!!!",
        "URGENT WARNING new chip in all smartphones activates in 2026 to track every purchase you make and report it to a global government database TURN OFF your phone NOW and tell everyone you know!!!",
        "Natural cure for ALL diseases that Big Pharma does NOT want you to know about just drink this mixture of herbs every morning and you will NEVER need a doctor again share with everyone!!!",
    ]

    real_x  = (real * 15)[:360]
    fake_x  = (fake * 14)[:336]

    prefixes = ["", "Report: ", "Update — ", "News: ", "Analysis: ", ""]
    all_texts  = [prefixes[i % len(prefixes)] + clean_text(t) for i, t in enumerate(real_x + fake_x)]
    all_labels = [1] * len(real_x) + [0] * len(fake_x)

    combined = list(zip(all_texts, all_labels))
    random.shuffle(combined)
    texts, labels = zip(*combined)

    print(f"    Built-in: {len(texts)} examples")
    return list(texts), list(labels)


# ─────────────────────────────────────────────
# Main training routine
# ─────────────────────────────────────────────

def train():
    os.makedirs("model", exist_ok=True)

    all_texts:  list[str] = []
    all_labels: list[int] = []

    loaders = [load_wellfake, load_liar, load_fakenewsnet, load_covid_fake]
    success = 0

    for loader in loaders:
        try:
            t, l = loader()
            if t:
                all_texts.extend(t)
                all_labels.extend(l)
                success += 1
        except Exception as e:
            print(f"    Loader {loader.__name__} error: {e}")

    if not all_texts:
        print("\nNo online dataset available — using built-in fallback.")
        all_texts, all_labels = builtin_dataset()

    # Deduplicate
    seen = set()
    deduped_texts, deduped_labels = [], []
    for t, l in zip(all_texts, all_labels):
        key = t[:80]
        if key not in seen:
            seen.add(key)
            deduped_texts.append(t)
            deduped_labels.append(l)

    all_texts  = deduped_texts
    all_labels = deduped_labels

    print(f"\n{'='*55}")
    print(f"  TOTAL TRAINING DATA : {len(all_texts):,} examples")
    print(f"  FAKE : {sum(1 for l in all_labels if l==0):,}")
    print(f"  REAL : {sum(1 for l in all_labels if l==1):,}")
    print(f"  Sources loaded: {success}/4")
    print(f"{'='*55}\n")

    # ── Vectorize ──
    print("Fitting TF-IDF vectorizer ...")
    vectorizer = TfidfVectorizer(
        max_features=70_000,
        ngram_range=(1, 3),
        stop_words="english",
        sublinear_tf=True,
        min_df=2,
        max_df=0.95,
        analyzer="word",
    )
    X = vectorizer.fit_transform(all_texts)
    y = np.array(all_labels)

    # ── Split ──
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.15, random_state=42, stratify=y
    )
    print(f"Training : {X_train.shape[0]:,} samples")
    print(f"Testing  : {X_test.shape[0]:,} samples\n")

    # ── Train ──
    print("Training Logistic Regression ...")
    model = LogisticRegression(
        max_iter=3000,
        C=2.0,
        solver="lbfgs",
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    # ── Evaluate ──
    y_pred   = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)

    print(f"\n{'='*55}")
    print(f"  MODEL ACCURACY : {accuracy:.2%}")
    print(f"{'='*55}")
    print(classification_report(y_test, y_pred, target_names=["FAKE", "REAL"]))

    # ── Save ──
    with open("model/fake_news_model.pkl", "wb") as f:
        pickle.dump(model, f)
    with open("model/tfidf_vectorizer.pkl", "wb") as f:
        pickle.dump(vectorizer, f)

    print("Saved → model/fake_news_model.pkl")
    print("Saved → model/tfidf_vectorizer.pkl")
    print(f"\nModel ready! Accuracy: {accuracy:.2%}  |  Trained on {len(all_texts):,} examples.\n")
    return accuracy


if __name__ == "__main__":
    train()
