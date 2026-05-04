const to = 'carlosgabriel.camppos@gmail.com';
const url = 'https://hgndulxohmkkkpdimoym.supabase.co/functions/v1/send-email-notification';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhnbmR1bHhvaG1ra2twZGltb3ltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1Mzk5MjEsImV4cCI6MjA5MzExNTkyMX0.JTS_JQwVfVJqkaK1AOd1Q0q7mtD-Jwh4n1TG6SbJppo';

const body = {
  to: to,
  slug: 'payment_confirmed',
  organization_id: 'dc1f5d6a-4714-46b2-92cc-5ff423c2b3ed',
  data: {
    '{{athlete_name}}': 'Carlos Gabriel',
    '{{amount}}': '150.00',
    '{{due_date}}': '04/05/2026'
  }
};

console.log('Disparando e-mail de teste para:', to);

fetch(url, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${anonKey}`
  },
  body: JSON.stringify(body)
})
.then(async res => {
  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Resposta:', data);
})
.catch(err => {
  console.error('Erro no disparo:', err);
});
