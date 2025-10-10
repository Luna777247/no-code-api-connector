const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

(async () => {
  const body = {
    connectionId: 'test-1',
    apiConfig: { baseUrl: 'https://jsonplaceholder.typicode.com/users', method: 'GET', headers: {} },
    parameters: [],
    fieldMappings: [{ sourcePath: '$.id', targetField: 'user_id', dataType: 'number' }],
  }

  try {
    const res = await fetch('http://localhost:3000/api/execute-run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    const data = await res.json()
    console.log('RESPONSE:', JSON.stringify(data, null, 2))
  } catch (err) {
    console.error('ERROR', err)
  }
})()
