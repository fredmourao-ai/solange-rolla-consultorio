import { expect, test } from './fixtures'
import { signInDemo } from './demo-auth'

test('authorized staff downloads CSV XLSX and PDF administrative exports',async({page})=>{
 await signInDemo(page); await page.goto('/relatorios/baixar',{waitUntil:'domcontentloaded'})
 for(const [label,ext] of [['Baixar CSV','csv'],['Baixar XLSX','xlsx'],['Baixar PDF','pdf']] as const){
  const downloadPromise=page.waitForEvent('download'); await page.getByRole('button',{name:label}).click(); const download=await downloadPromise; expect(download.suggestedFilename()).toMatch(new RegExp(`\\.${ext}$`)); const path=await download.path(); expect(path).toBeTruthy(); await page.goto('/relatorios/baixar',{waitUntil:'domcontentloaded'})
 }
})

test('export screen explicitly excludes clinical content',async({page})=>{await signInDemo(page);await page.goto('/relatorios/baixar');await expect(page.getByText(/Informações clínicas não fazem parte/)).toBeVisible()})
