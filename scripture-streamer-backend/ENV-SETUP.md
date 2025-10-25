# 🔑 Environment Setup for LLM Scripture Detection

## The Problem

Your LLM scripture detection isn't working because the `ASSEMBLY_AI_API_KEY` environment variable isn't set.

You're seeing:
```
scriptureReferences: []  ← Empty!
```

But the backend should show:
```
🤖 Using LLM to detect scriptures from: "Alma, Chapter two, verse two."
```

---

## Solution: Create `.env` File

### Step 1: Get Your API Key

1. Go to: https://www.assemblyai.com/dashboard
2. Copy your API key (starts with something like `abc123...`)

### Step 2: Create `.env` File

In your terminal, run:

```bash
cd /Users/seth/Desktop/Scripture-Reference-IOS/scripture-streamer-backend
nano .env
```

### Step 3: Add This Content

```
ASSEMBLY_AI_API_KEY=your_actual_api_key_here
```

**Replace `your_actual_api_key_here` with your real API key!**

### Step 4: Save and Exit

- Press `Ctrl + O` to save
- Press `Enter` to confirm
- Press `Ctrl + X` to exit

### Step 5: Restart Backend

```bash
pkill -9 node
npm run start:dev
```

---

## Quick Test

After creating `.env`, test if it works:

```bash
node test-llm-simple.js
```

You should see:
```
✅ API Key found
🤖 Testing LLM Gateway with: "Alma, Chapter two, verse two."
✅ LLM Response:
[{"book":"Alma","chapter":2,"verse":2,...}]
```

---

## Alternative: Set Environment Variable Directly

If you don't want to create a `.env` file, you can set it when running:

```bash
ASSEMBLY_AI_API_KEY=your_key_here npm run start:dev
```

Or add it to your shell profile (`~/.zshrc` or `~/.bashrc`):

```bash
export ASSEMBLY_AI_API_KEY=your_key_here
```

Then:
```bash
source ~/.zshrc  # or ~/.bashrc
npm run start:dev
```

---

## Verify It's Working

### 1. Check Backend Logs

After setting the key and restarting, you should see:

```
StreamingGateway initialized
✅ AssemblyAI WebSocket ready for user: ...
```

### 2. Say a Scripture

Say: "Alma chapter two verse two"

### 3. Check Backend Logs

You should now see:
```
🤖 Using LLM to detect scriptures from: "Alma, Chapter two, verse two."
🤖 Sending to LLM Gateway: "Alma, Chapter two, verse two."
🤖 LLM Response: [{"book":"Alma","chapter":2,"verse":2,...}]
✅ LLM detected 1 scripture(s)
📖 ✅ LLM found scripture: Alma 2:2 -> https://...
```

### 4. Check iOS Logs

You should see:
```
✅ Found scriptureReferences array with 1 item(s)
📖 Found 1 scripture reference(s):
   - Alma 2:2
```

### 5. Check UI

Blue card should appear! 🎉

---

## Troubleshooting

### "API Key not found"
- Make sure `.env` file is in `scripture-streamer-backend/` directory
- Check the file name is exactly `.env` (with the dot)
- Make sure there are no spaces around the `=` sign

### "401 Unauthorized"
- Your API key is wrong or expired
- Get a new key from AssemblyAI dashboard
- Make sure you copied the entire key

### Still not working?
- Restart your terminal
- Kill all node processes: `pkill -9 node`
- Start fresh: `npm run start:dev`

---

## Security Note

⚠️ **NEVER commit `.env` to git!**

The `.env` file should already be in `.gitignore`. Verify:

```bash
cat .gitignore | grep .env
```

You should see:
```
.env
```

If not, add it:
```bash
echo ".env" >> .gitignore
```

---

## Next Steps

Once you've set up the `.env` file:

1. ✅ Restart backend
2. ✅ Run test: `node test-llm-simple.js`
3. ✅ Try saying "Alma chapter two verse two"
4. ✅ Watch for blue card in UI!

Good luck! 🚀

