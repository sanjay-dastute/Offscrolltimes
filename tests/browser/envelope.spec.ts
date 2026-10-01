import { expect, test } from '@playwright/test'

test('tapping the backdrop opens the envelope even when browser storage is blocked', async ({page}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Storage blocked') }
    Storage.prototype.setItem = () => { throw new Error('Storage blocked') }
  })
  await page.goto('/')
  const dialog=page.getByRole('dialog', {name:/Open today/})
  await expect(dialog).toBeVisible()
  await dialog.click({position:{x:5,y:5}})
  await expect(dialog).toHaveCount(0)
  await expect(page.locator('body')).not.toHaveClass(/envelope-active/)
  const header=page.locator('header')
  await expect(header.getByText('Offscroll Times',{exact:true})).toBeVisible()
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true)
})
