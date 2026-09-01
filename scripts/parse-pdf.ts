import fs from 'fs';
import pdf from 'pdf-parse';

async function main() {
  const dataBuffer = fs.readFileSync('test.pdf');
  const data = await pdf(dataBuffer);
  console.log(data.text.substring(0, 1500));
}
main().catch(console.error);
