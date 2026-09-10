(() => {
  const form = document.getElementById('invitation-form');
  const canvas = document.getElementById('invitation-preview');
  const ctx = canvas.getContext('2d');
  const status = document.getElementById('download-status');
  const imageButton = document.querySelector('[data-download-image]');
  const logo = new Image();
  logo.src = '/assets/logo/new_logo_horizontal.png';
  const duck = new Image();
  duck.src = '/assets/duck.png';
  const palettes = {
    garden: { paper:'#fffdf5', accent:'#248b91', soft:'#e2f0df', pop:'#ed8c80', gold:'#f3ca62' },
    dream: { paper:'#fff8fc', accent:'#925985', soft:'#eee2f4', pop:'#dd9bac', gold:'#e4c17c' },
    sun: { paper:'#fffaf0', accent:'#a6642b', soft:'#fbebce', pop:'#df9369', gold:'#eac05c' }
  };
  const fontsReady = Promise.all([
    document.fonts.load('600 56px DynaPuff', 'Ștefănuț împlinește'),
    document.fonts.load('700 48px Mali', 'Ștefănuț împlinește'),
    document.fonts.load('600 24px Nunito', 'Sâmbătă, Constanța')
  ]);
  const data = () => Object.fromEntries(new FormData(form));
  const timeInput = form.elements.time;
  function seedTimeOnOpen() {
    if (timeInput.value) return;
    const now = new Date();
    timeInput.value = String(now.getHours()).padStart(2, '0') + ':00';
    render();
  }
  function formatDate(value, fallback = 'Ziua petrecerii') {
    if (!value) return fallback;
    const date = new Date(value + 'T12:00:00');
    return Number.isNaN(date.getTime()) ? fallback : new Intl.DateTimeFormat('ro-RO', {day:'numeric',month:'long',year:'numeric'}).format(date);
  }
  function text(value, x, y, size, color, maxWidth = 680, family = 'Nunito', weight = 800) {
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    do { ctx.font = weight + ' ' + size + 'px ' + family; size -= .5; } while (ctx.measureText(value).width > maxWidth && size > 10);
    ctx.fillText(value, x, y);
  }
  function lines(value, x, y, maxWidth, size, color, maxLines = 2) {
    let result;
    do {
      ctx.font = '600 ' + size + 'px Nunito';
      result = [''];
      for (const word of value.split(/\s+/)) {
        const last = result.length - 1;
        const test = result[last] ? result[last] + ' ' + word : word;
        if (ctx.measureText(test).width > maxWidth && result[last]) result.push(word);
        else result[last] = test;
      }
      if (result.length <= maxLines) break;
      size -= 1;
    } while (size > 11);
    result.forEach((line, index) => text(line, x, y + index * size * 1.3, size, color, maxWidth, 'Nunito', 600));
  }
  function rounded(x,y,w,h,r,color) {
    ctx.beginPath(); ctx.roundRect(x,y,w,h,r); ctx.fillStyle=color; ctx.fill();
  }
  function drawContained(image, x, y, width, height) {
    if (!image.complete || !image.naturalWidth || !image.naturalHeight) return;
    const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
    const drawnWidth = image.naturalWidth * scale;
    const drawnHeight = image.naturalHeight * scale;
    ctx.drawImage(image, x + (width - drawnWidth) / 2, y + (height - drawnHeight) / 2, drawnWidth, drawnHeight);
  }
  function balloon(x,y,color,scale=1) {
    ctx.fillStyle=color;ctx.beginPath();ctx.ellipse(x,y,22*scale,29*scale,-.15,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#abbab1';ctx.lineWidth=1.3*scale;ctx.beginPath();ctx.moveTo(x,y+29*scale);ctx.bezierCurveTo(x-12*scale,y+48*scale,x+15*scale,y+72*scale,x,y+96*scale);ctx.stroke();
    ctx.fillStyle='#ffffff80';ctx.beginPath();ctx.ellipse(x-7*scale,y-9*scale,4*scale,9*scale,.25,0,Math.PI*2);ctx.fill();
  }
  function render() {
    const d = data();
    const p = palettes[d.theme] || palettes.garden;
    ctx.setTransform(2,0,0,2,0,0);
    ctx.fillStyle=p.paper;ctx.fillRect(0,0,840,592);
    ctx.fillStyle=p.soft;ctx.beginPath();ctx.arc(0,0,125,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(840,592,125,0,Math.PI*2);ctx.fill();
    for(let i=0;i<34;i++){
      const x=(i*167+23)%840,y=(i*97+14)%592;
      if(x>100&&x<740&&y>42&&y<560)continue;
      ctx.fillStyle=[p.gold,p.pop,p.accent][i%3];ctx.save();ctx.translate(x,y);ctx.rotate(i);
      if(i%2)ctx.fillRect(-3,-2,7,4);else{ctx.beginPath();ctx.arc(0,0,3,0,Math.PI*2);ctx.fill();}ctx.restore();
    }
    balloon(-8,128,p.gold,1.35);balloon(68,165,p.pop,1.15);balloon(108,117,p.gold,.9);
    balloon(765,161,p.accent,1.2);balloon(832,88,p.pop,1.35);balloon(780,72,p.gold,.8);
    text('EȘTI INVITAT LA ZIUA MEA!',420,61,16,p.accent,600,'DynaPuff',600);
    const childName = d.child.trim() || 'Numele copilului';
    let childSize = 60;
    ctx.font = '600 ' + childSize + 'px DynaPuff';
    while (ctx.measureText(childName).width > 610 && childSize > 34) {
      childSize -= 1;
      ctx.font = '600 ' + childSize + 'px DynaPuff';
    }
    const childPillWidth = Math.min(690, Math.max(230, ctx.measureText(childName).width + 76));
    ctx.save();
    ctx.translate(420,132);
    ctx.rotate(-0.025);
    rounded(-childPillWidth / 2,-36,childPillWidth,72,24,p.soft);
    ctx.restore();
    text(childName,420,151,childSize,p.accent,childPillWidth - 56,'DynaPuff',600);
    rounded(322,177,196,42,21,p.soft);
    text('Împlinesc ' + (d.age || '…') + (d.age === '1' ? ' an!' : ' ani!'),420,205,23,p.accent,180);
    text('Hai să sărbătorim împreună!',420,225,25,'#344c55',640,'DynaPuff',600);
    rounded(210,254,420,86,22,'#ffffff');
    rounded(210,254,124,86,22,p.accent);
    text('CÂND?',272,281,13,'#ffffff',100,'DynaPuff',600);
    text(d.time || 'Ora petrecerii',272,314,16,'#ffffff',106,'Nunito',800);
    text(formatDate(d.date),482,288,21,'#344c55',260,'DynaPuff',600);
    text(d.end ? 'Până la ' + d.end : 'Te așteptăm cu drag!',482,318,16,p.accent,260,'Nunito',800);
    drawContained(duck, -58, 300, 300, 300);
    if (logo.complete && logo.naturalWidth) drawContained(logo, 285, 358, 270, 108);
    else text('Becky’s Garden',420,430,15,p.accent,150,'DynaPuff',600);
    text('NE VEDEM LA',420,441,11,p.accent,220,'Nunito',900);
    lines(d.address.trim() || 'Adresa petrecerii',420,465,650,18,'#53676b');
    lines(d.message.trim(),420,510,480,17,'#53676b');
    const contact = [d.parent.trim(),d.phone.trim()].filter(Boolean).join(' · ');
    const rsvp = [d.rsvp ? 'Confirmă până pe ' + formatDate(d.rsvp,'') : contact ? 'Confirmă participarea' : '',contact].filter(Boolean).join(' · ');
    lines(rsvp,420,563,660,15,p.accent,2);
    canvas.setAttribute('aria-label', 'Invitație pentru ' + (d.child || 'copil') + ', ' + (d.age || '…') + ' ani. ' + formatDate(d.date) + ', ' + (d.time || 'ora necompletată') + '. ' + d.venue + ', ' + d.address);
    const requested = Math.max(1,Math.min(100,Math.floor(Number(d.quantity)||1)));
    const copies = Math.ceil(requested/2)*2;
    document.getElementById('paper-summary').textContent = copies + ' invitații · ' + copies/2 + (copies === 2 ? ' coală A4' : ' coli A4') + (requested !== copies ? ' · o copie în plus pentru coala completă' : '');
  }

  // One shared high-resolution JPEG, reused twice on each A4 page.
  // Each image is exactly A5 landscape: 210 × 148 mm. A 1 mm gap carries the cut guide.
  function makePdf(jpeg, count) {
    const encode = value => new TextEncoder().encode(value);
    const objects = [];
    const add = value => { objects.push(typeof value === 'string' ? encode(value) : value); return objects.length; };
    const concat = chunks => {
      const result = new Uint8Array(chunks.reduce((n,c)=>n+c.length,0));let offset=0;
      chunks.forEach(chunk=>{result.set(chunk,offset);offset+=chunk.length;});return result;
    };
    const pages = count/2;
    add('<< /Type /Catalog /Pages 2 0 R >>');
    add('<< /Type /Pages /Count ' + pages + ' /Kids [' + Array.from({length:pages},(_,i)=>(5+i*2)+' 0 R').join(' ') + '] >>');
    add(concat([encode('<< /Type /XObject /Subtype /Image /Width 1680 /Height 1184 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length '+jpeg.length+' >>\nstream\n'),jpeg,encode('\nendstream')]));
    for(let i=0;i<pages;i++){
      const instructions = 'q 595.2756 0 0 419.5276 0 422.3622 cm /Invite Do Q\nq 595.2756 0 0 419.5276 0 0 cm /Invite Do Q\n0.72 G 0.3 w [3 4] 0 d 15 420.9449 m 580 420.9449 l S\n';
      const streamId = add('<< /Length '+encode(instructions).length+' >>\nstream\n'+instructions+'endstream');
      add('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.2756 841.8898] /Resources << /XObject << /Invite 3 0 R >> >> /Contents '+streamId+' 0 R >>');
    }
    const chunks=[encode('%PDF-1.4\n')],offsets=[0];let length=chunks[0].length;
    objects.forEach((object,i)=>{
      offsets.push(length);const chunk=concat([encode((i+1)+' 0 obj\n'),object,encode('\nendobj\n')]);chunks.push(chunk);length+=chunk.length;
    });
    const xref=length;
    chunks.push(encode('xref\n0 '+(objects.length+1)+'\n0000000000 65535 f \n'+offsets.slice(1).map(offset=>String(offset).padStart(10,'0')+' 00000 n \n').join('')+'trailer\n<< /Size '+(objects.length+1)+' /Root 1 0 R >>\nstartxref\n'+xref+'\n%%EOF'));
    return new Blob(chunks,{type:'application/pdf'});
  }
  let pending;
  form.addEventListener('input', () => {
    cancelAnimationFrame(pending);pending=requestAnimationFrame(render);
    form.elements.end.setCustomValidity('');
    status.textContent='';
  });
  timeInput.addEventListener('focus', seedTimeOnOpen);
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    if(!form.reportValidity())return;
    const d=data();
    if(d.end && d.end <= d.time){form.elements.end.setCustomValidity('Ora de încheiere trebuie să fie după ora de început.');form.elements.end.reportValidity();return;}
    const button=form.querySelector('[type="submit"]');button.disabled=true;status.textContent='Pregătim invitațiile…';
    try {
      await fontsReady;
      if(!d.child.trim() || !d.venue.trim() || !d.address.trim())throw Error('Completează numele, locul și adresa petrecerii.');
      render();
      const jpegBlob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.96));
      if(!jpegBlob)throw Error('Imaginea nu a putut fi pregătită. Încearcă din nou.');
      const count=Math.ceil(Number(d.quantity)/2)*2;
      const pdf=makePdf(new Uint8Array(await jpegBlob.arrayBuffer()),count);
      const url=URL.createObjectURL(pdf),link=document.createElement('a');
      const name=d.child.trim().replace(/[^\p{L}\p{N}-]+/gu,'-');
      link.href=url;link.download='Invitatii-'+name+'-'+count+'.pdf';document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
      status.textContent='PDF pregătit: '+count+' invitații pe '+count/2+' coli A4. Verifică descărcările.';
    } catch(error){status.textContent=error.message || 'Nu am putut genera PDF-ul. Încearcă din nou.';}
    finally{button.disabled=false;}
  });
  imageButton.addEventListener('click', async () => {
    if (!form.reportValidity()) return;
    const d = data();
    if (d.end && d.end <= d.time) { form.elements.end.setCustomValidity('Ora de încheiere trebuie să fie după ora de început.'); form.elements.end.reportValidity(); return; }
    imageButton.disabled = true;
    status.textContent = 'Pregătim imaginea…';
    try {
      await fontsReady;
      render();
      const imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!imageBlob) throw Error('Imaginea nu a putut fi pregătită. Încearcă din nou.');
      const url = URL.createObjectURL(imageBlob), link = document.createElement('a');
      const name = d.child.trim().replace(/[^\p{L}\p{N}-]+/gu, '-');
      link.href = url;
      link.download = 'Invitatie-' + name + '.png';
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      status.textContent = 'Imaginea invitației este pregătită pentru trimitere digitală.';
    } catch (error) { status.textContent = error.message || 'Nu am putut genera imaginea. Încearcă din nou.'; }
    finally { imageButton.disabled = false; }
  });
  render();
  logo.addEventListener('load', render, { once: true });
  duck.addEventListener('load', render, { once: true });
  fontsReady.then(render).catch(()=>{status.textContent='Fonturile nu s-au încărcat. Reîncarcă pagina înainte de descărcare.';});
})();
