"use strict";

const GROQ_MODEL = "qwen/qwen3.8-27b";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

function aiError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

async function generateAI(messages) {
    const apiKey = String(process.env.GROQ_API_KEY || "").trim();
    if (!apiKey) {
        throw aiError(503, "GROQ_API_KEYが未設定です。18歳以上の保護者がAPIキーを管理し、PowerShellで設定してからサーバーを再起動してください。");
    }

    if (!Array.isArray(messages) || messages.length < 1 || messages.length > 12) {
        throw aiError(400, "AIへのメッセージ形式が正しくありません。");
    }

    const normalizedMessages = messages.map(message => {
        if (!message || !["system", "user", "assistant"].includes(message.role) || typeof message.content !== "string") {
            throw aiError(400, "AIへのメッセージ形式が正しくありません。");
        }
        const content = message.content.trim();
        if (!content || content.length > 20000) {
            throw aiError(400, "AIへのメッセージは1件20,000文字以内で入力してください。");
        }
        return { role: message.role, content };
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
        const response = await fetch(GROQ_ENDPOINT, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: GROQ_MODEL,
                messages: normalizedMessages,
                max_tokens: 800,
                temperature: 0.4,
                stream: false
            }),
            signal: controller.signal
        });

        let data;
        try {
            data = await response.json();
        } catch {
            throw aiError(502, "Groqから正しい応答を受け取れませんでした。");
        }

        if (!response.ok) {
            if (response.status === 429) {
                throw aiError(429, "Groqの無料利用枠またはレート制限に達しました。時間をおいて再度お試しください。");
            }
            if (response.status === 401 || response.status === 403) {
                throw aiError(503, "Groq APIキーを確認してください。キーは18歳以上の保護者が管理してください。");
            }
            console.error("[YOUTH NOW] Groq API returned HTTP", response.status);
            throw aiError(502, "Groqでエラーが発生しました。少し待ってから再度お試しください。");
        }

        const content = data.choices?.[0]?.message?.content;
        const answer = (typeof content === "string"
            ? content
            : Array.isArray(content)
                ? content.map(part => typeof part.text === "string" ? part.text : "").join("")
                : "").trim();
        if (!answer) throw aiError(502, "Groqから回答が返りませんでした。質問を変えて再度お試しください。");
        return answer;
    } catch (error) {
        if (error.statusCode) throw error;
        if (error.name === "AbortError") throw aiError(504, "AIの応答に時間がかかっています。もう一度お試しください。");
        console.error("[YOUTH NOW] Groq API connection failed:", error.message);
        throw aiError(502, "Groqに接続できませんでした。インターネット接続を確認してください。");
    } finally {
        clearTimeout(timeout);
    }
}

module.exports = { generateAI };
