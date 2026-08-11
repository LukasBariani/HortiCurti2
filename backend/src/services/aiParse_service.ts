import Groq from "groq-sdk";
import { produtosValidos } from "../data/products";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `Você é um parser de pedidos de hortifrúti estritamente programado para retornar apenas JSON válido. Sua única tarefa é extrair os produtos, quantidades e unidades da mensagem do usuário.
Se a mensagem não contiver um pedido válido, retorne: {"items": []}
REGRA ABSOLUTA: você só pode usar produtos EXATAMENTE como aparecem na lista abaixo. 
Se um produto mencionado pelo usuário não estiver nesta lista EXATA, 
você DEVE ignorá-lo completamente e não incluí-lo no array "items".
NÃO aproxime, NÃO substitua, NÃO invente.
[LISTA DE PRODUTOS VÁLIDOS]  ${produtosValidos.join("\n- ")} Se a mensagem mencionar algo que não está na lista, voce deve ignorar esse item (não inventar)
[DIRETRIZES DE FORMATAÇÃO]
- Normalize as unidades de medida para os seguintes padrões:
  * mço / maço / maco -> "maço"
  * cx / caixa -> "caixa"
  * kg / quilo / kls -> "kg"
  * un / unidade / ud -> "unidade"
  * sc / saco -> "saco"
  * g / gramas -> "g"
- Se a unidade não for especificada, use "unidade" como padrão.
- Converta os valores numéricos por extenso para números (ex: "dois" -> 2).

[RESTRIÇÕES CRÍTICAS]
- Retorne APENAS o objeto JSON, sem markdown (\`\`\`json) e sem texto explicativo.
- Se a mensagem não contiver um pedido válido, retorne: {"items": []}

[ESQUEMA DO JSON]
{
  "items": [
    {
      "productName": "string",
      "quantity": number,
      "unit": "string"
    }
  ]
}
  REGRA ABSOLUTA: você só pode usar produtos EXATAMENTE como aparecem na lista abaixo. 
Se um produto mencionado pelo usuário não estiver nesta lista EXATA, 
você DEVE ignorá-lo completamente e não incluí-lo no array "items".
NÃO aproxime, NÃO substitua, NÃO invente.`;

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
      model: "llama-3.1-8b-instant",
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
    return "{items: []}";
  }
}
