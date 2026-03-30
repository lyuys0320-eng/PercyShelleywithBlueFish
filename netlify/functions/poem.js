// 文件路径必须是：你的仓库/netlify/functions/poem.js

exports.handler = async function(event, context) {
    // 1. 设置跨域头 (CORS)
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // 2. 处理预检请求
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    // 只接受 POST 请求
    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            headers, 
            body: JSON.stringify({ error: '只允许 POST 请求' }) 
        };
    }

    try {
        // 3. 解析前端发来的数据 (Netlify 中 event.body 是字符串，必须手动转 JSON)
        const body = JSON.parse(event.body);
        const prompt = body.prompt;

        if (!prompt) {
            return { 
                statusCode: 400, 
                headers, 
                body: JSON.stringify({ error: '缺少灵感提示词 (prompt)' }) 
            };
        }

        // 获取环境变量中的 Gemini API Key
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return { 
                statusCode: 500, 
                headers, 
                body: JSON.stringify({ error: '服务器未配置 GEMINI_API_KEY' }) 
            };
        }

        // AI 的系统提示词 (人设)
        const systemPrompt = "You are a poet channeling the spirit of Percy Bysshe Shelley. Write a deeply romantic, nature-focused, and slightly melancholic poem inspired by the user's prompt. CRITICAL REQUIREMENT: Your poem MUST contain AT LEAST 150 words,and do not mention the water. Expand on the imagery extensively. Return ONLY the poem text, without any quotes or explanations.";

        // 4. 向 Google Gemini 官方发起请求
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
        const poem = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!poem) {
            throw new Error('未能从 Gemini 返回的数据中解析出诗句');
        }

        // 5. 将生成的诗句按照 Netlify 的格式返回给前端
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ poem: poem })
        };

    } catch (error) {
        console.error('AI 调用失败:', error);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: 'AI 生成诗句失败，请稍后再试' })
        };
    }
};
