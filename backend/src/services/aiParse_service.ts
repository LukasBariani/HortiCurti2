import Groq from "groq-sdk";
import { produtosValidos } from "../data/products";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `Você é um extraidor de pedidos de hortifrúti focado em precisão absoluta. 
Sua tarefa é ler a mensagem do cliente, identificar TODOS os produtos mencionados e converter em JSON.

[LISTA DE PRODUTOS VÁLIDOS NO CATÁLOGO]
${produtosValidos.map((p) => `- ${p}`).join("\n")}

[REGRAS DE EXTRAÇÃO]
1. EXTRAIA TODOS OS ITENS: Nunca ignore produtos listados na mensagem (ex: se o usuário pediu 2 itens, extraia os 2).
2. CASAMENTO DE NOME (MATCH): O "productName" DEVE ser EXATAMENTE um dos nomes da lista acima. Se o cliente escrever apenas "tomate" e na lista existir "Tomate", use "Tomate". Se não houver correspondência clara, ignore o item.
3. UNIDADES DE MEDIDA:
   - mço / maço / maco -> "maço"
   - cx / caixa -> "caixa"
   - kg / quilo / kls -> "kg"
   - un / unidade / ud -> "unidade"
   - sc / saco -> "saco"
   - g / gramas -> "g"
   - Se a unidade não for citada, use "unidade" como padrão.
4. NÚMEROS: Converta palavras por extenso em números inteiros (ex: "três" -> 3).

[FORMATO DE SAÍDA - APENAS JSON VÁLIDO]
{
  "items": [
    {
      "productName": "Nome Exato da Lista",
      "quantity": 2,
      "unit": "unidade"
    }
  ]
}

Se nenhum produto da lista for encontrado na mensagem, retorne exatamente: {"items": []}`;

export async function parseMessage(rawMessagem: any) {
  try {
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: rawMessagem,
        },
      ],
      model: "openai/gpt-oss-20b",
      response_format: { type: "json_object" }, // retorno em JSON
      temperature: 0.1,
    });
    const content = completion.choices[0]?.message?.content || '{"items": []}';
    try {
      return JSON.parse(content);
    } catch {
      return { items: [] };
    }
  } catch (error) {
    console.error("Erro ao chamar a API da Groq:", error);
    return { items: [] };
  }
}
