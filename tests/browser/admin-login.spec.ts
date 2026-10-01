import { expect,test } from '@playwright/test'
import { readFileSync,existsSync } from 'node:fs'

test('administrator can sign in and out with a password without Google',async({page})=>{
  test.skip(!existsSync('admin-credentials.local'),'Local administrator credentials required')
  const credentials=JSON.parse(readFileSync('admin-credentials.local','utf8')) as {username:string;password:string}
  await page.addInitScript(()=>sessionStorage.setItem('offscroll-times-envelope-seen-v1','1'))
  await page.goto('/admin')
  await expect(page.getByRole('heading',{name:'Admin sign in'})).toBeVisible()
  await page.getByLabel('Username',{exact:true}).fill(credentials.username)
  await page.getByLabel('Password',{exact:true}).fill(credentials.password)
  await page.getByRole('button',{name:'Sign in',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Business control room'})).toBeVisible()
  await page.getByRole('button',{name:'Sign out',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Admin sign in'})).toBeVisible()
  expect((await page.request.get('/api/admin')).status()).toBe(403)
})
