Small quality-of-life tweaks for [Bunpro](https://bunpro.jp) — features I wish Bunpro had. "Better" is just alliteration; if they want to ship any of these themselves, that would be great.

Open settings from the **sliders icon** in the site header (between Search and Help), in the quiz toolbar, or Tampermonkey → Better Bunpro → Settings.

### Show unverified example sentences for A1+ vocab

On the web, Bunpro does not show unverified example sentences for A1+ vocab, even if you enable "Display Sentence alongside Translation Questions" in review settings. That is despite such a feature being present in the mobile app. If enabled, this feature will show these unverified sentences after submitting a correct answer, and it will cycle through which sentence is displayed for each review session.

### Cycle example sentences with Tab

Once you have answered a review correctly, press **Tab** to see the same item in another one of its example sentences, and again to keep cycling through them. On a cloze review the question sentence itself is swapped; elsewhere the sentence card is.

Your answer always belongs to the sentence you were actually quizzed on — nothing is re-graded — and the sentence your next review session starts on is unchanged.

Idea from [Joseph G](https://greasyfork.org/en/users/1613422-joseph-g)'s [Bunpro Sentence Cycle](https://greasyfork.org/en/scripts/584571-bunpro-sentence-cycle).

### Keep guessing after a wrong answer

On a review you type an English translation or a reading into, Bunpro reveals the answer the moment you get it wrong, even if you were one word away. With this enabled, a wrong answer is not submitted at all: your text stays in the box so you can try again.

To give up and see the answer, either clear the box and press **Enter**, or press **Enter** again on the same wrong answer. Cloze reviews are untouched, since Bunpro already hints there instead of revealing.

Because a guess this catches never reaches Bunpro, the review is graded on the answer you finally submit.

### Add a wrong answer as a synonym

After you miss a vocab translation, Bunpro hides "Your Synonyms" down in More Info. With this on, an **Add as synonym** button sits next to the wrong answer so you can accept what you typed without scrolling. Press **S** for the same action.

Adding it saves the guess through Bunpro's own synonym request and immediately marks this review correct. A guess Bunpro already accepts is not offered again.

### Edit a wrong answer with Left Arrow

After a typed answer is marked wrong, **Backspace** undoes it but also deletes the last character. With this on, **Left Arrow** undoes without deleting: the full guess stays in the box and the caret moves left, so you can walk to a mistake in the middle and fix it. Same "answer undone" toast as Backspace. Correct answers and More Info tab switching are left alone.

### Play real speakers instead of TTS audio

When Bunpro would play synthesised audio for a vocabulary term, this plays a recording of a person saying it instead, looked up the same way [Yomitan](https://github.com/yomidevs/yomitan) does (JapanesePod101, then Jisho). The vocabulary **Details** pitch-accent control is always term audio and is always rewritten when a recording exists. The quiz answer-bar stays on Bunpro's clip only when an **on-screen example sentence** already has its own speaker; otherwise the answer bar follows the term recording too. A term Bunpro already recorded is left alone. If nobody has recorded the word, the synthesised clip still plays.

After you answer (or immediately on a vocabulary / grammar detail page), each play button is tinted when a real recording will play — answer bar, Details pitch play, and each **Examples** list speaker in Info. Its tooltip names the source: **JPod101 Recording**, **Jisho Recording**, **Bunpro TTS**, or **Bunpro Recording**.

Source: [github.com/mwsmws22/mws-greasyfork](https://github.com/mwsmws22/mws-greasyfork/tree/main/better-bunpro)
