import {browser} from '../pdf.js';
import {investmentHtml} from './html.js';

export async function renderInvestmentPdf(model){
  const started=Date.now();const instance=await browser();
  const timer=setTimeout(()=>instance.close().catch(()=>{}),30000);
  try{
    const context=await instance.newContext({javaScriptEnabled:false});const page=await context.newPage();
    await page.route('**/*',route=>route.abort());await page.setContent(investmentHtml(model),{waitUntil:'load',timeout:10000});
    const layout=await page.evaluate(({address,date})=>{
      const source=document.querySelector('#source'),sections=[...source.children];let content,pageNode;const pages=[];
      const makePage=()=>{if(pages.length>=200)throw new Error('REPORT_PAGE_LIMIT');pageNode=document.createElement('div');pageNode.className='page';const header=document.createElement('header');header.textContent=`PROPERTY INTELLIGENCE · ${address.slice(0,85)}`;content=document.createElement('div');content.className='content';const footer=document.createElement('footer');footer.textContent=date;pageNode.append(header,content,footer);document.body.append(pageNode);pages.push(pageNode);};
      const fits=()=>content.scrollHeight<=content.clientHeight;
      const splitText=text=>{const parts=[];let remaining=text;while(remaining.length>240){let at=remaining.lastIndexOf(' ',240);if(at<120)at=240;else at++;parts.push(remaining.slice(0,at));remaining=remaining.slice(at);}parts.push(remaining);return parts;};
      const heading=(title,continued=false)=>{const h=document.createElement('h2');h.textContent=title+(continued?' — continued':'');return h;};
      makePage();
      for(const section of sections){
        const title=section.dataset.title;
        if(['Maximum Allowable Offer','Comparable Properties'].includes(title)&&content.children.length){const used=content.lastElementChild.getBoundingClientRect().bottom-content.getBoundingClientRect().top;if(section.offsetHeight<=content.clientHeight&&section.offsetHeight>content.clientHeight-used)makePage();}
        let head=heading(title);content.append(head);
        if(content.getBoundingClientRect().bottom-head.getBoundingClientRect().bottom<100){head.remove();makePage();head=heading(title);content.append(head);}
        for(const block of [...section.children].slice(1)){
          if(block.tagName==='TABLE'){
            let target;const makeTable=()=>{target=block.cloneNode(false);target.append(block.querySelector('thead').cloneNode(true),document.createElement('tbody'));content.append(target);};
            makeTable();
            for(const original of block.querySelectorAll('tbody tr')){
              // Bound each continuation fragment, preserving all characters and values.
              const cells=[...original.children].map(c=>c.textContent),parts=cells.map(splitText);const count=Math.max(...parts.map(x=>x.length));
              for(let n=0;n<count;n++){
                const row=document.createElement('tr');for(let c=0;c<parts.length;c++){const td=document.createElement('td');td.textContent=parts[c][n]??(c===0?`${cells[0]} (continued)`:'');row.append(td);}target.tBodies[0].append(row);
                if(!fits()){row.remove();if(!target.tBodies[0].children.length)target.remove();if(content.lastChild===head)head.remove();makePage();head=heading(title,true);content.append(head);makeTable();target.tBodies[0].append(row);if(!fits())throw new Error('REPORT_ROW_OVERFLOW');}
              }
            }
          }else{
            content.append(block);if(!fits()){block.remove();if(content.lastChild===head)head.remove();makePage();head=heading(title,true);content.append(head,block);if(!fits())throw new Error('REPORT_BLOCK_OVERFLOW');}
          }
        }
      }
      source.remove();pages.forEach((p,i)=>{const span=document.createElement('span');span.textContent=`Page ${i+1} of ${pages.length}`;p.querySelector('footer').append(span);});
      return {pages:pages.length,overflow:pages.some(p=>p.querySelector('.content').scrollHeight>p.querySelector('.content').clientHeight)};
    },{address:model.property.address??'Address not supplied',date:model.reportMeta.generatedAt.slice(0,10)});
    if(layout.overflow)throw new Error('REPORT_LAYOUT_STOP');
    const bytes=await page.pdf({format:'Letter',printBackground:true,preferCSSPageSize:true,margin:{top:0,bottom:0,left:0,right:0},timeout:15000});
    if(bytes.length>20_000_000)throw new Error('REPORT_SIZE_LIMIT');
    return {bytes,pages:layout.pages,renderMs:Date.now()-started,byteLength:bytes.length};
  }finally{clearTimeout(timer);await instance.close();}
}
