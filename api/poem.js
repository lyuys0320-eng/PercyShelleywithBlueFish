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

    // 2. 从 Vercel 的环境变量中安全地读取 DeepSeek API Key
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: '服务器未配置 DEEPSEEK_API_KEY' });
    }

    // AI 的系统提示词 (人设)
    const systemPrompt = "You are a poet channeling the spirit of Percy Bysshe Shelley. Write a deeply romantic, nature-focused, and slightly melancholic poem inspired by the user's prompt. CRITICAL REQUIREMENT: Your poem MUST contain AT LEAST 150 words,and do not mention the water. Expand on the imagery extensively. Return ONLY the poem text, without any quotes or explanations.";

    try {
        // 3. 向 DeepSeek 官方发起请求
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}` // Key 被安全地保护在后端
            },
            body: JSON.stringify({
                model: 'deepseek-chat', // 使用 DeepSeek 的对话模型
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`DeepSeek 接口报错: ${response.status}`);
        }

        const data = await response.json();
        const poem = data.choices[0].message.content;

        // 4. 将生成的诗句返回给你的前端网页
        res.status(200).json({ poem });

    } catch (error) {
        console.error('AI 调用失败:', error);
        res.status(500).json({ error: 'AI 生成诗句失败，请稍后再试' });
    }
}