import { NextApiRequest, NextApiResponse } from 'next'
import axios from 'axios'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Only POST requests allowed' })
  }

  const userMessage = req.body.message?.text || ''
  const userPhone = req.body.message?.from || ''

  // ChatGPT 응답 생성
  const gptRes = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: userMessage }],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  )

  const reply = gptRes.data.choices[0].message.content

  // WATI 응답 전송
  await axios.post(
    'https://app.wati.io/api/v1/sendSessionMessage',
    {
      phone: userPhone,
      messageText: reply,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WATI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    }
  )

  res.status(200).json({ status: 'success' })
}
