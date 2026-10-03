import { expect, test } from '@playwright/test'

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{sessionStorage.setItem('offscroll-times-envelope-seen-v1','1');localStorage.setItem('offscroll_analytics_choice','declined')})
})

test('new customers enter every required field and save their default delivery address',async({page})=>{
  let submitted: Record<string,unknown>|undefined
  await page.route('**/api/customer',async route=>{
    if(route.request().method()==='PATCH'){submitted=route.request().postDataJSON();return route.fulfill({json:{ok:true}})}
    return route.fulfill({json:{profileComplete:true,csrf:'test-csrf',profile:{display_name:'New Reader',email:'reader@example.com'},address:null,user:{name:'New Reader'},subscriptions:[],payments:[],fulfilments:[],events:[],identities:[]}})
  })
  await page.goto('/complete-profile')
  await expect(page.getByRole('heading',{name:'Complete your profile'})).toBeVisible()
  await expect(page.locator('main input[required]')).toHaveCount(8)
  await page.getByRole('button',{name:'Save and continue'}).click()
  expect(submitted).toBeUndefined()
  await page.getByLabel('WhatsApp number').fill('+919999999999')
  await page.getByLabel('Full delivery address').fill('1 Test Street')
  await page.getByLabel('City',{exact:true}).fill('Pune')
  await page.getByLabel('State / region').fill('Maharashtra')
  await page.getByLabel('Postal code').fill('411001')
  await page.getByRole('button',{name:'Save and continue'}).click()
  await expect(page).toHaveURL(/\/account$/)
  expect(submitted).toMatchObject({action:'profile.complete',name:'New Reader',email:'reader@example.com',whatsapp:'+919999999999',address:{name:'New Reader',line1:'1 Test Street',city:'Pune',region:'Maharashtra',postalCode:'411001',country:'IN'}})
})

test('Instagram floats above WhatsApp and is absent from the footer',async({page})=>{
  await page.goto('/about')
  await expect(page.getByRole('link',{name:'Follow Offscroll Times on Instagram'})).toBeVisible()
  await expect(page.locator('footer').getByRole('link',{name:'Instagram',exact:true})).toHaveCount(0)
  await expect(page.getByRole('link',{name:'Message us on WhatsApp'})).toBeVisible()
})
