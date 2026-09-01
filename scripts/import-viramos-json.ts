import fs from 'fs';
import { procesarResultadosParseados } from '../src/lib/extractors/import-service';

async function main() {
  const data = JSON.parse(fs.readFileSync('viramos_data.json', 'utf8'));
  await procesarResultadosParseados(data.campeonatoId, data.claseId, data.regatistas);
  console.log('Importacion exitosa.');
}
main().catch(console.error);
