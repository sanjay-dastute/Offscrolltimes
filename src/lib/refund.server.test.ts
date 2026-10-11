import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTestD1 } from './lifecycle/testing'
import { registerCustomerCheckout, applyCustomerPaymentSucceeded } from './customer/store.server'
import { requestFullRazorpayRefund } from './refund.server'
import { createRazorpayRefund, retrieveRazorpayPayment } from './razorpay.server'
vi.mock('./razorpay.server',()=>({createRazorpayRefund:vi.fn(),retrieveRazorpayPayment:vi.fn(),cancelRazorpaySubscription:vi.fn(),RazorpayApiError:class extends Error{status=502}}))
let db:D1Database
const now=Date.parse('2026-12-01T12:00:00Z')
beforeEach(async()=>{vi.clearAllMocks();db=createTestD1();await registerCustomerCheckout(db,{id:'sub_test',userId:'owner',planId:'monthly',planName:'Monthly',durationMonths:1,quantity:1,currency:'INR',amountMinor:19900,now});await applyCustomerPaymentSucceeded(db,{id:'sub_test',payerUserId:'owner',paymentId:'pay_test',paidAt:now,now});vi.mocked(retrieveRazorpayPayment).mockResolvedValue({status:'captured',amount:19900,currency:'INR',amount_refunded:0});vi.mocked(createRazorpayRefund).mockResolvedValue({id:'rfnd_test',status:'processed'})})
describe('Razorpay cancellation refunds',()=>{
  it('rejects another owner without contacting Razorpay',async()=>{await expect(requestFullRazorpayRefund(db,{subscriptionId:'sub_test',ownerId:'other',actorId:'other',source:'customer',now})).rejects.toThrow('No refundable');expect(createRazorpayRefund).not.toHaveBeenCalled()})
  it('rejects customer refunds at exactly 48 hours',async()=>{await expect(requestFullRazorpayRefund(db,{subscriptionId:'sub_test',ownerId:'owner',actorId:'owner',source:'customer',now:now+48*3600000})).rejects.toThrow('48-hour');expect(createRazorpayRefund).not.toHaveBeenCalled()})
  it('allows an administrator partial refund after 48 hours and preserves the original paid amount',async()=>{await requestFullRazorpayRefund(db,{subscriptionId:'sub_test',actorId:'admin',source:'administrator',amountMinor:9900,now:now+72*3600000});expect(createRazorpayRefund).toHaveBeenCalledWith('pay_test',9900,expect.any(Object));expect(await db.prepare("SELECT status,amount_minor FROM customer_payments WHERE provider_payment_id='pay_test'").first()).toMatchObject({status:'paid',amount_minor:19900});await expect(requestFullRazorpayRefund(db,{subscriptionId:'sub_test',actorId:'admin',source:'administrator',amountMinor:9900,now})).rejects.toThrow('already');expect(createRazorpayRefund).toHaveBeenCalledTimes(1)})
  it('rejects an amount above the captured payment',async()=>{await expect(requestFullRazorpayRefund(db,{subscriptionId:'sub_test',actorId:'admin',source:'administrator',amountMinor:20000,now})).rejects.toThrow('refund amount');expect(createRazorpayRefund).not.toHaveBeenCalled()})
})
