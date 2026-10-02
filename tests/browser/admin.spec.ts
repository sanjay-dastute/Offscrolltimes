import { expect, test } from '@playwright/test'

const reports={financialByCurrency:[],customers:1,activePaidEntitlements:0,entitledCopiesRemaining:0,cancellations:0,completedTerms:0,addressExceptions:0,paymentExceptions:0,fulfilmentExceptions:0,deliveryExceptions:0,paidRevenueMinor:0,refundedPayments:0,refundedMinor:0,discountRedemptions:0,discountCostMinor:0,nextEdition:null,renewals:0,retentionPercent:0,countryDistribution:[],fulfilmentByCountry:[],funnel:{}}
const customer={user_id:'user_test',display_name:'Test Reader',email:'reader@example.com',phone:'+919999999999',whatsapp_number:'+918888888888',account_state:'active',subscription_count:0,subscription_status:null,payment_status:null,address:{name:'Test Reader',line1:'1 Test Street',city:'Pune',postalCode:'411001',country:'IN'}}

test.beforeEach(async({page})=>{
  await page.addInitScript(()=>{sessionStorage.setItem('offscroll-times-envelope-seen-v1','1')})
  await page.route('**/api/admin',async route=>{
    if(route.request().method()==='POST')return route.fulfill({json:{ok:true}})
    await route.fulfill({json:{user:{id:'admin_test',name:'Test Admin'},csrf:'test-csrf',subscriptions:[],payments:[],fulfilments:[],editions:[],eligibility:[],products:[],options:[],discounts:[{id:'offer_test',code:'SAVE10',kind:'percentage',value:1000,active:1}],zones:[],content:[],enquiries:[],audits:[],promotionReports:[],reports}})
  })
  await page.route('**/api/admin/customers?*',async route=>{
    const url=new URL(route.request().url()),pageNumber=Number(url.searchParams.get('page')||1)
    await route.fulfill({json:{customers:[{...customer,display_name:pageNumber===2?'Second Reader':customer.display_name}],page:pageNumber,pages:2,total:26}})
  })
})

async function openAdmin(page:import('@playwright/test').Page) {
  await page.goto('/admin')
  await expect(page.getByRole('heading',{name:'Business control room'})).toBeVisible()
}

test('customer directory shows details, paginates and submits audited contact corrections',async({page})=>{
  await openAdmin(page)
  await page.getByRole('button',{name:'customers',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Test Reader'})).toBeVisible()
  await expect(page.getByText('1 Test Street')).toBeVisible()
  await page.getByRole('button',{name:'Next',exact:true}).click()
  await expect(page.getByRole('heading',{name:'Second Reader'})).toBeVisible()
  await page.getByRole('button',{name:'Edit contact details'}).click()
  await page.getByLabel('Full name',{exact:true}).fill('Updated Reader')
  await page.getByLabel('WhatsApp number',{exact:true}).fill('+917373050093')
  await page.getByLabel('Reason for correction').fill('Customer requested correction')
  const request=page.waitForRequest(request=>request.url().endsWith('/api/admin')&&request.method()==='POST')
  await page.getByRole('button',{name:'Save contact',exact:true}).click()
  expect((await request).postDataJSON()).toMatchObject({action:'customer.contact',userId:'user_test',name:'Updated Reader',whatsapp:'+917373050093',csrf:'test-csrf'})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true)
})

test('offers can be edited and deactivated without a payment gateway',async({page})=>{
  await openAdmin(page)
  await page.getByRole('button',{name:'offers',exact:true}).click()
  await page.getByRole('button',{name:'Edit',exact:true}).click()
  await expect(page.getByLabel('Discount code')).toHaveValue('SAVE10')
  await page.getByLabel('Value',{exact:true}).fill('1500')
  const save=page.waitForRequest(request=>request.url().endsWith('/api/admin')&&request.method()==='POST')
  await page.getByRole('button',{name:'Save offer'}).click()
  expect((await save).postDataJSON()).toMatchObject({action:'catalog.upsert',kind:'discount',id:'offer_test',value:'1500',active:true})
  const toggle=page.waitForRequest(request=>request.url().endsWith('/api/admin')&&request.method()==='POST')
  await page.getByRole('button',{name:'Deactivate'}).click()
  expect((await toggle).postDataJSON()).toMatchObject({action:'discount.toggle',active:false})
})

test('anonymous requests cannot read the actual admin API',async({request})=>{
  expect((await request.get('/api/admin')).status()).toBe(403)
  expect((await request.get('/api/admin/customers')).status()).toBe(403)
})

test('customers can save their WhatsApp contact information',async({page})=>{
  await page.route('**/api/customer',async route=>{
    if(route.request().method()==='PATCH')return route.fulfill({json:{ok:true}})
    await route.fulfill({json:{user:{id:'reader_test',name:'Test Reader'},csrf:'customer-csrf',profile:{display_name:'Test Reader',email:'reader@example.com',phone:null,whatsapp_number:null},identities:[],subscriptions:[],payments:[],fulfilments:[],events:[]}})
  })
  await page.goto('/account')
  await page.getByLabel('Phone number',{exact:true}).fill('+919999999999')
  await page.getByLabel('WhatsApp number (optional)',{exact:true}).fill('+917373050093')
  const save=page.waitForRequest(request=>request.url().endsWith('/api/customer')&&request.method()==='PATCH')
  await page.getByRole('button',{name:'Save contact details'}).click()
  expect((await save).postDataJSON()).toMatchObject({action:'profile.contact',whatsapp:'+917373050093',csrf:'customer-csrf'})
  await expect(page.getByText('Contact details saved.')).toBeVisible()
})

test('profile is reachable from the header and a new user can save a delivery address',async({page})=>{
  await page.route('**/api/customer',async route=>{
    if(route.request().method()==='PATCH')return route.fulfill({json:{ok:true}})
    await route.fulfill({json:{user:{id:'reader_test',name:'Test Reader'},csrf:'customer-csrf',profile:null,address:null,identities:[],subscriptions:[],payments:[],fulfilments:[],events:[]}})
  })
  await page.goto('/faq')
  await expect(page.getByPlaceholder('Try “address”, “refund” or “international”')).toBeVisible()
  await page.getByRole('link',{name:'My profile',exact:true}).first().click()
  await expect(page).toHaveURL(/\/account$/)
  const form=page.locator('form').filter({has:page.getByRole('button',{name:'Save delivery address'})})
  await form.getByLabel('Recipient name').fill('Test Reader')
  await form.getByLabel('Address line 1',{exact:true}).fill('1 Test Street')
  await form.getByLabel('City',{exact:true}).fill('Pune')
  await form.getByLabel('State / region',{exact:true}).fill('Maharashtra')
  await form.getByLabel('Postal code').fill('411001')
  const save=page.waitForRequest(request=>request.url().endsWith('/api/customer')&&request.method()==='PATCH')
  await form.getByRole('button',{name:'Save delivery address'}).click()
  await expect(page.getByRole('heading',{name:'Saved delivery address'})).toBeVisible()
  await expect(page.locator('address')).toContainText('1 Test Street')
  expect((await save).postDataJSON()).toMatchObject({action:'profile.address',address:{name:'Test Reader',line1:'1 Test Street',country:'IN'}})
  await expect(page.getByText('Delivery address saved.')).toBeVisible()
})

test('email signup saves to the local database and the management link unsubscribes',async({page})=>{
  await page.goto('/')
  const email=`browser-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`
  await page.getByLabel('Email address for blog updates').fill(email)
  await page.getByRole('checkbox',{name:/I agree to receive Offscroll Times email updates/}).check()
  await page.locator('footer').getByRole('button',{name:'Subscribe',exact:true}).click()
  await expect(page.getByText('You’re subscribed to Offscroll Times email updates.')).toBeVisible()
  await page.getByRole('link',{name:'Manage email signup'}).click()
  await page.getByRole('button',{name:'Unsubscribe from email updates'}).click()
  await expect(page.getByText('You have been unsubscribed.')).toBeVisible()
})
