// Server-owned fee configuration. Previews never authorize a payment or change a wallet.
// Basis points: 100 bps = 1%. Currency arithmetic uses whole rupiah, half-up rounding.
export const PAYMENT_POLICY_VERSION='2026-10-22.1';
const deepFreeze=value=>{Object.values(value).forEach(v=>{if(v&&typeof v==='object')deepFreeze(v)});return Object.freeze(value)};
export const PAYMENT_POLICY=deepFreeze({
 version:PAYMENT_POLICY_VERSION,currency:'IDR',status:'CONFIGURED_PREVIEW',paymentsEnabled:false,
 platform:{giftBps:700,ticketBps:1000,topupBps:0,withdrawalCommissionBps:0,
  basis:'GROSS_GIFT_OR_TICKET_IDR',chargeStage:'GIFT_OR_TICKET',source:'PRODUCT_CHARTER_v0.6'},
 gateway:{provider:'CODAPAY',method:'QRIS',feeBps:265,fixedFeeIDR:0,vatOnFeeBps:1100,
  vatBasis:'GATEWAY_FEE_ONLY',chargeStage:'TOPUP_ONLY',costBearer:'PENDING_CONFIRMATION',
  source:'CODAPAY_CONTRACT_RECORD_2026_10_13',reconciliationRequired:true},
 tax:{platformVat:{status:'REQUIRES_TAX_PROFILE',basis:'PLATFORM_FEE_IF_APPLICABLE',
   statutoryRateBps:1200,dppNumerator:11,dppDenominator:12,
   legalBasis:'PMK 131/2024 Pasal 3; applicability and PKP status require verification'},
  hostWithholding:{status:'REQUIRES_TAX_PROFILE',rateBps:null,
   legalBasis:'Classify recipient and payment before applying PPh; no universal flat rate'}},
 withdrawal:{providerFeeIDR:null,providerFeeStatus:'NOT_CONFIGURED',enabled:false},
 limits:{minPreviewIDR:1000,maxPreviewIDR:10000000},
 rounding:'HALF_UP_IDR'
});

const bps=(amount,rate)=>Number((BigInt(amount)*BigInt(rate)+5000n)/10000n);
const row=(code,label,amountIDR,note='')=>({code,label,amountIDR,note});
export function feePreview(kind,amountIDR){
 if(!['gift','ticket','topup'].includes(kind))throw new RangeError('Jenis transaksi tidak valid.');
 if(!Number.isSafeInteger(amountIDR)||amountIDR<PAYMENT_POLICY.limits.minPreviewIDR||amountIDR>PAYMENT_POLICY.limits.maxPreviewIDR)
  throw new RangeError('Masukkan nominal bulat Rp1.000–Rp10.000.000.');
 const result={policyVersion:PAYMENT_POLICY_VERSION,currency:'IDR',kind,grossIDR:amountIDR,
  previewOnly:true,canTransact:false,finalPayableIDR:null,hostNetIDR:null};
 if(kind==='topup'){
  const gatewayFeeIDR=bps(amountIDR,PAYMENT_POLICY.gateway.feeBps)+PAYMENT_POLICY.gateway.fixedFeeIDR;
  const gatewayVatIDR=bps(gatewayFeeIDR,PAYMENT_POLICY.gateway.vatOnFeeBps);
  return {...result,platformFeeIDR:0,gatewayFeeIDR,gatewayVatIDR,
   providerSettlementEstimateIDR:amountIDR-gatewayFeeIDR-gatewayVatIDR,
   lines:[row('gross','Nominal pembayaran',amountIDR),row('platform','Komisi NADMO pada top-up',0),
    row('gateway','Estimasi biaya Codapay QRIS (2,65%)',-gatewayFeeIDR),
    row('gateway-vat','Pajak atas biaya Codapay (11%)',-gatewayVatIDR),
    row('provider-net','Estimasi penerimaan NADMO dari provider',amountIDR-gatewayFeeIDR-gatewayVatIDR)],
   note:'Estimasi biaya provider, bukan potongan penghasilan host. Pembebanan biaya top-up belum ditetapkan. Jumlah bayar dan kredit final menunggu integrasi serta rekonsiliasi provider.'};
 }
 const rateBps=kind==='gift'?PAYMENT_POLICY.platform.giftBps:PAYMENT_POLICY.platform.ticketBps;
 const platformFeeIDR=bps(amountIDR,rateBps),amountAfterPlatformIDR=amountIDR-platformFeeIDR;
 return {...result,rateBps,platformFeeIDR,amountAfterPlatformIDR,platformVatIDR:null,hostWithholdingIDR:null,
  lines:[row('gross',kind==='gift'?'Nilai gift / saweran':'Nilai tiket privat',amountIDR),
   row('platform','Potongan NADMO ('+(rateBps/100)+'%)',-platformFeeIDR),
   row('platform-vat','PPN jasa NADMO',null,'Menunggu verifikasi pajak'),
   row('host-tax','PPh penghasilan host',null,'Sesuai profil pajak host'),
   row('host-subtotal','Bagian host sebelum pajak dan biaya lain',amountAfterPlatformIDR)],
  note:'Simulasi, belum menjadi saldo. Pajak yang belum ditentukan tidak berarti 0%. Biaya top-up dihitung terpisah dan tidak dipotong ulang pada gift. Biaya pencairan menunggu provider.'};
}

export function paymentPolicyEndpoint(request){
 const url=new URL(request.url);
 if(!['/api/payments/policy','/api/payments/quote'].includes(url.pathname))return null;
 const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{
  'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
 if(request.method!=='GET')return json({ok:false,error:'METHOD_NOT_ALLOWED'},405);
 if(url.pathname==='/api/payments/policy')return json({ok:true,policy:PAYMENT_POLICY});
 // Reject client-provided fee/tax rates, duplicate parameters and ambiguous numeric notation.
 const params=url.searchParams;
 if([...params.keys()].some(k=>!['kind','amountIDR'].includes(k))||params.getAll('kind').length!==1||params.getAll('amountIDR').length!==1||!/^\d{1,8}$/.test(params.get('amountIDR')||''))
  return json({ok:false,error:'Parameter simulasi tidak valid.'},400);
 try{return json({ok:true,quote:feePreview(params.get('kind'),Number(params.get('amountIDR')))})}
 catch(error){return json({ok:false,error:error.message},400)}
}
