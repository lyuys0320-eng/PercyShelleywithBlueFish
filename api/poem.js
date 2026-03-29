// 文件路径：你的仓库/api/poem.js
// 这是一个运行在 Vercel 上的 Serverless 无服务器函数

export default async function handler(req, res) {
    // 1. 设置允许跨域请求 (CORS)，允许你的 GitHub Pages 访问这个接口
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理浏览器的预检请求 (OPTIONS)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // 只接受 POST 请求
    if (req.method !== 'POST') {
        return res.status(405).json({ error: '只允许 POST 请求' });
    }

    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: '缺少灵感提示词 (prompt)' });
    }

    // 2. 从 Vercel 的环境变量中安全地读取 Gemini API Key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: '服务器未配置 GEMINI_API_KEY' });
    }

    // AI 的系统提示词 (人设)
    const systemPrompt = "You are a poet channeling the spirit of Percy Bysshe Shelley. Write a deeply romantic, nature-focused, and slightly melancholic poem inspired by the user's prompt. CRITICAL REQUIREMENT: Your poem MUST contain AT LEAST 150 words,and do not mention the water. Expand on the imagery extensively. Return ONLY the poem text, without any quotes or explanations.";

    try {
        // 3. 向 Google Gemini 官方发起请求
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                systemInstruction: { parts: [{ text: systemPrompt }] }
            })
        });

        if (!response.ok) {
            throw new Error(`Gemini 接口报错: ${response.status}`);
        }

        const data = await response.json();
        
        // 解析 Gemini 的返回数据结构
        const poem = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!poem) {
            throw new Error('未能从 Gemini 返回的数据中解析出诗句');
        }

        // 4. 将生成的诗句返回给你的前端网页
        res.status(200).json({ poem });

    } catch (error) {
        console.error('AI 调用失败:', error);
        res.status(500).json({ error: 'AI 生成诗句失败，请稍后再试' });
    }
}
