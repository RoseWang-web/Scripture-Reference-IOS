# 🐛 Debugging Scripture Reference Detection

## Your Issue: "Alma. 1:20" detected but no blue card appears

Follow these steps to diagnose the problem:

---

## Step 1: Check Backend Logs 📋

After you say "Alma one twenty", look for these logs in your backend terminal:

### ✅ SUCCESS - You should see:
```
🔍 Attempting to parse scripture from: "Alma. 1:20"
📖 ✅ Found scripture: Alma 1:20 -> https://www.churchofjesuschrist.org/study/scriptures/bofm/alma/1.20?lang=eng
📤 Sending transcript to iOS app: { transcript: "Alma. 1:20", scriptureReferences: [...] }
```

### ❌ PROBLEM - If you see:
```
🔍 Attempting to parse scripture from: "Alma. 1:20"
📖 ❌ Could not parse "Alma. 1:20" as a scripture reference
```
**→ The parser doesn't recognize the format. Try saying it differently:**
- "Alma chapter one verse twenty"
- "Alma one colon twenty"

---

## Step 2: Check iOS Logs 📱

In Xcode console, look for these logs:

### ✅ SUCCESS - You should see:
```
📨 Turn event received, payload: ...
🔍 Transcript text: "Alma. 1:20"
🔍 Checking for scriptureReferences in payload...
✅ Found scriptureReferences array with 1 item(s)
📖 Found 1 scripture reference(s):
   - Alma 1:20
     URL: https://www.churchofjesuschrist.org/study/scriptures/bofm/alma/1.20?lang=eng
📖 ✅ Updated scriptureReferences array, now has 1 total reference(s)
```

### ❌ PROBLEM - If you see:
```
❌ No scriptureReferences found in payload
```
**→ Backend parsed it but iOS didn't receive it properly**
- Check if backend is sending the enrichedData correctly
- Verify Socket.IO connection is stable

### ❌ PROBLEM - If you see:
```
⚠️ scriptureReferences array was empty after parsing
```
**→ The parsing succeeded but failed to create ScriptureReference objects**
- Check if all required fields (book, chapter, url, originalText) are present

---

## Step 3: Check UI State 🎨

### Test 1: Print the array count
Add this temporary debug line in NoteView.swift after line 48:

```swift
// Scripture references display
Text("DEBUG: scriptureReferences count = \(audioStreamer.scriptureReferences.count)")
    .foregroundColor(.red)

if !audioStreamer.scriptureReferences.isEmpty {
    // ... existing code
}
```

**Expected:** Should show "DEBUG: scriptureReferences count = 1" after detection

**If it shows 0:** The array isn't being updated on the main thread properly

---

## Step 4: Common Issues & Solutions 🔧

### Issue 1: Transcript format not recognized
**Symptoms:** Backend logs show `❌ Could not parse`

**Solutions:**
1. Try different phrasings:
   - ✅ "Alma chapter one verse twenty"
   - ✅ "Alma one colon twenty"
   - ✅ "Alma one twenty" (might work)
   - ❌ "Alma dot one colon twenty" (period might confuse it)

2. Check if Alma is in the scripture database:
   - It should be at line 105-111 in `scriptures.service.ts`

### Issue 2: Only formatted transcripts show blue cards
**Symptoms:** You see the reference in logs but card doesn't appear until you stop recording

**This is NORMAL!** The scripture parsing happens on every Turn, but:
- Unformatted turns (`turn_is_formatted: false`) are temporary/live updates
- Formatted turns (`turn_is_formatted: true`) are final/completed sentences
- The blue card should appear when the turn becomes formatted

**To verify:** Keep recording for a few seconds after saying the scripture. The card should appear when AssemblyAI finalizes the transcript.

### Issue 3: Blue card appears then disappears
**Symptoms:** Card flashes briefly then vanishes

**Cause:** You might be leaving the view or the array is being cleared

**Check:**
- Don't navigate away from NoteView (it clears on `.onDisappear`)
- Don't stop/start recording multiple times quickly

### Issue 4: Multiple cards for same scripture
**Symptoms:** "Alma 1:20" appears 5 times

**Cause:** Scripture is detected on every Turn update (unformatted + formatted)

**Solution:** We should deduplicate. Add this to AudioStreamer.swift:

```swift
if !refs.isEmpty {
    DispatchQueue.main.async {
        // Deduplicate by URL
        let existingURLs = Set(self.scriptureReferences.map { $0.url })
        let newRefs = refs.filter { !existingURLs.contains($0.url) }
        self.scriptureReferences.append(contentsOf: newRefs)
        print("📖 ✅ Updated scriptureReferences array, now has \(self.scriptureReferences.count) total reference(s)")
    }
}
```

---

## Step 5: Test with Known Working Examples 🧪

Try these EXACT phrases (they should definitely work):

1. **"Alma chapter thirty-two verse twenty-one"**
   - Should parse as: Alma 32:21

2. **"Two Nephi chapter three verse two"**
   - Should parse as: 2 Nephi 3:2

3. **"First Nephi chapter three"**
   - Should parse as: 1 Nephi 3

If NONE of these work, there's a deeper issue with the scripture service integration.

---

## Step 6: Manual Test 🔬

You can manually test the parser by adding this to your backend:

**File:** `scripture-streamer-backend/test-manual.js`
```javascript
const testInput = "Alma 1:20";
console.log(`Testing: "${testInput}"`);

// Simulate what the service does
const cleanKey = testInput.toLowerCase()
    .replace(/\s+chapter\s+/g, ' ')
    .replace(/\s+verse\s+/g, ':')
    .replace(/:\s+/g, ':');

console.log(`Cleaned: "${cleanKey}"`);

// Check if it matches the regex
const verseRangeRegex = /([a-z0-9\s&]+)\s+(\d+):([\d\-,]+)/;
const match = cleanKey.match(verseRangeRegex);

if (match) {
    console.log("✅ Matched!");
    console.log("Book:", match[1].trim());
    console.log("Chapter:", match[2]);
    console.log("Verse:", match[3]);
} else {
    console.log("❌ No match");
}
```

Run: `node test-manual.js`

---

## Quick Checklist ✓

Before asking for help, verify:

- [ ] Backend shows `📖 ✅ Found scripture:` in logs
- [ ] iOS shows `📖 ✅ Updated scriptureReferences array` in logs
- [ ] `audioStreamer.scriptureReferences.count` is > 0
- [ ] You're still on NoteView (didn't navigate away)
- [ ] You waited a few seconds after speaking (for formatted turn)
- [ ] The scripture format is valid (e.g., "Alma 1:20" not "Alma 1 20")

---

## What to Share if Still Broken 📤

If it's still not working, share:

1. **Exact phrase you said:** "I said: Alma one twenty"
2. **Backend logs:** Copy the `🔍 Attempting to parse` and `📖` lines
3. **iOS logs:** Copy the `🔍 Transcript text` and `📖` lines
4. **Screenshot:** Show the UI (does transcript appear? any errors?)

This will help diagnose whether it's:
- A parsing issue (backend can't recognize format)
- A transmission issue (backend → iOS)
- A UI issue (data is there but not displaying)

---

Good luck! 🍀

