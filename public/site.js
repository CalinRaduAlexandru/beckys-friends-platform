document.fonts.ready.then(() => document.body.classList.remove('is-loading'));

document.addEventListener('click', event => {
  const link = event.target.closest('a[href]');
  if (!link || event.defaultPrevented || link.target === '_blank' || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const url = new URL(link.href, window.location.href);
  if (url.origin !== window.location.origin) return;
  if (url.pathname === window.location.pathname && url.hash) return;
  if (url.pathname === window.location.pathname && !url.hash) return;
  event.preventDefault();
  document.body.classList.add('is-page-leaving');
  window.setTimeout(() => { window.location.href = url.href; }, 280);
});

document.querySelectorAll('[data-current-year]').forEach(node => { node.textContent = new Date().getFullYear(); });

const cloudDivider=document.querySelector('.cloud-divider');
if(cloudDivider){
  if('IntersectionObserver' in window){
    const cloudObserver=new IntersectionObserver(([entry])=>{
      if(entry.isIntersecting){
        cloudDivider.classList.add('is-visible');
        cloudObserver.disconnect();
      }
    },{threshold:.12,rootMargin:'0px 0px -8%'});
    cloudObserver.observe(cloudDivider);
  }else{
    cloudDivider.classList.add('is-visible');
  }
}

const happyDuck=document.querySelector('[data-happy-duck]');
const happyDuckCanvas=document.querySelector('[data-happy-duck-canvas]');
if(happyDuck&&happyDuckCanvas){
  happyDuck.src='/assets/duck-happy.mp4';
  happyDuck.pause();
  const duckContext=happyDuckCanvas.getContext('2d',{willReadFrequently:true});
  let duckFramePending=false;

  const scheduleDuckFrame=()=>{
    if(duckFramePending||happyDuck.paused||happyDuck.ended)return;
    duckFramePending=true;
    if('requestVideoFrameCallback' in happyDuck){
      happyDuck.requestVideoFrameCallback(renderDuckFrame);
    }else{
      window.requestAnimationFrame(renderDuckFrame);
    }
  };

  const renderDuckFrame=()=>{
    duckFramePending=false;
    if(!duckContext||happyDuck.readyState<2)return scheduleDuckFrame();
    const width=happyDuckCanvas.width;
    const height=happyDuckCanvas.height;
    duckContext.drawImage(happyDuck,0,0,width,height);
    const frame=duckContext.getImageData(0,0,width,height);
    const pixels=frame.data;
    const background=new Uint8Array(width*height);
    const queue=new Int32Array(width*height);
    let queueStart=0;
    let queueEnd=0;
    const isDarkBackground=index=>{
      const offset=index*4;
      return Math.max(pixels[offset],pixels[offset+1],pixels[offset+2])<36;
    };
    const addBackground=index=>{
      if(background[index]||!isDarkBackground(index))return;
      background[index]=1;
      queue[queueEnd++]=index;
    };

    for(let x=0;x<width;x++){
      addBackground(x);
      addBackground((height-1)*width+x);
    }
    for(let y=1;y<height-1;y++){
      addBackground(y*width);
      addBackground(y*width+width-1);
    }
    while(queueStart<queueEnd){
      const index=queue[queueStart++];
      const x=index%width;
      const y=(index-x)/width;
      if(x>0)addBackground(index-1);
      if(x<width-1)addBackground(index+1);
      if(y>0)addBackground(index-width);
      if(y<height-1)addBackground(index+width);
    }

    // The animation contains a small enclosed black gap where the head meets
    // the body. It does not touch the frame edge, so the background flood-fill
    // above cannot remove it. Remove only dark enclosed components in the
    // neck area; keep the duck's eyes, bill and outlines unchanged.
    const neckBlack = new Uint8Array(width * height);
    const neckQueue = new Int32Array(width * height);
    const neckPixels = new Int32Array(width * height);
    for(let start=0;start<width*height;start++){
      if(neckBlack[start]||background[start]||!isDarkBackground(start))continue;
      let head=0,tail=0,count=0,sumX=0,sumY=0;
      neckBlack[start]=1;
      neckQueue[tail++]=start;
      while(head<tail){
        const index=neckQueue[head++],x=index%width,y=(index-x)/width;
        neckPixels[count++]=index; sumX+=x; sumY+=y;
        const neighbors=[x?index-1:-1,x<width-1?index+1:-1,y?index-width:-1,y<height-1?index+width:-1];
        neighbors.forEach(next=>{
          if(next>=0&&!neckBlack[next]&&!background[next]&&isDarkBackground(next)){
            neckBlack[next]=1; neckQueue[tail++]=next;
          }
        });
      }
      const centerX=sumX/count/width;
      const centerY=sumY/count/height;
      if(count>=6&&centerX>.36&&centerX<.66&&centerY>.43&&centerY<.62){
        for(let pixel=0;pixel<count;pixel++)pixels[neckPixels[pixel]*4+3]=0;
      }
    }

    const watermarkLeft=Math.floor(width*.6);
    const watermarkBottom=Math.ceil(height*.15);
    for(let y=0;y<height;y++){
      for(let x=0;x<width;x++){
        const index=y*width+x;
        const offset=index*4;
        if(background[index]||(x>=watermarkLeft&&y<=watermarkBottom)){
          pixels[offset+3]=0;
          continue;
        }
        const touchesBackground=(x>0&&background[index-1])||(x<width-1&&background[index+1])||(y>0&&background[index-width])||(y<height-1&&background[index+width]);
        if(touchesBackground){
          const lightness=Math.max(pixels[offset],pixels[offset+1],pixels[offset+2]);
          if(lightness<105)pixels[offset+3]=Math.min(pixels[offset+3],Math.max(0,Math.round((lightness-24)/81*255)));
        }
      }
    }
    duckContext.putImageData(frame,0,0);
    happyDuckCanvas.classList.add('is-rendering');
    scheduleDuckFrame();
  };

  happyDuck.addEventListener('loadedmetadata',()=>{
    const processingWidth=360;
    happyDuckCanvas.width=processingWidth;
    happyDuckCanvas.height=Math.round(processingWidth*happyDuck.videoHeight/happyDuck.videoWidth);
  },{once:true});
  happyDuck.addEventListener('play',scheduleDuckFrame);
  const playHappyDuck=()=>{
    if(happyDuck.dataset.played)return;
    happyDuck.dataset.played='true';
    happyDuck.currentTime=0;
    happyDuck.play().catch(()=>{});
    window.setTimeout(()=>happyDuck.pause(),4000);
  };
  if('IntersectionObserver' in window){
    const duckObserver=new IntersectionObserver(([entry])=>{
      if(entry.isIntersecting){playHappyDuck();duckObserver.disconnect();}
    },{threshold:.35});
    duckObserver.observe(happyDuckCanvas);
  }else playHappyDuck();
}

const featureReveal=document.querySelector('.feature-reveal');
if(featureReveal){
  const revealFeatures=()=>{
    featureReveal.classList.add('is-visible');
    window.setTimeout(()=>featureReveal.classList.add('is-reveal-complete'),1450);
  };
  if('IntersectionObserver' in window){
    const featureObserver=new IntersectionObserver(([entry])=>{
      if(entry.isIntersecting){
        revealFeatures();
        featureObserver.disconnect();
      }
    },{threshold:.14,rootMargin:'0px 0px -12%'});
    featureObserver.observe(featureReveal);
  }else{
    revealFeatures();
  }
}

const locationCarousel=document.querySelector('[data-location-carousel]');
if(locationCarousel){
  const testimonials=[
    ['/assets/testimoniale/testimonial01.png','Recenzie Google de la Cristina Grecu'],
    ['/assets/testimoniale/testimonial02.png','Recenzie Google'],
    ['/assets/testimoniale/testimonial03.png','Recenzie Google'],
    ['/assets/testimoniale/testimonial04.png','Recenzie Google'],
    ['/assets/testimoniale/testimonial05.png','Recenzie Google'],
    ['/assets/testimoniale/testimonial06.png','Recenzie Google'],
    ['/assets/testimoniale/testimonial07.png','Recenzie Google'],
    ['/assets/testimoniale/testimonial08.png','Recenzie Google'],
    ['/assets/testimoniale/testimonial09.png','Recenzie Google']
  ];
  const track=locationCarousel.querySelector('[data-location-track]');
  const dotsWrap=locationCarousel.querySelector('.location-carousel-dots');
  const loopedTestimonials=[testimonials[testimonials.length-1],...testimonials,testimonials[0],testimonials[1]];
  track.innerHTML=loopedTestimonials.map(([src,alt])=>`<article class="location-testimonial"><img src="${src}" alt="${alt}"></article>`).join('');
  let active=0;
  const visibleCount=()=>window.matchMedia('(max-width: 800px)').matches?1:3;
  const maxIndex=()=>testimonials.length-1;
  const renderDots=()=>{
    const total=maxIndex()+1;
    dotsWrap.innerHTML=Array.from({length:total},(_,index)=>`<button class="location-carousel-dot${index===active?' is-active':''}" type="button" data-carousel-dot="${index}" aria-label="Poziția ${index+1}"></button>`).join('');
    dotsWrap.querySelectorAll('[data-carousel-dot]').forEach(dot=>dot.addEventListener('click',()=>showTestimonial(Number(dot.dataset.carouselDot))));
  };
  const showTestimonial=(index)=>{
    const max=maxIndex();
    active=(index+max+1)%(max+1);
    const firstCard=track.querySelector('.location-testimonial');
    const gap=parseFloat(getComputedStyle(track).gap)||0;
    const offsetIndex=visibleCount()===3?active:active+1;
    track.style.transform=`translateX(-${offsetIndex*(firstCard.getBoundingClientRect().width+gap)}px)`;
    track.querySelectorAll('.location-testimonial').forEach(card=>card.classList.remove('is-center'));
    const centerIndex=active+1;
    track.querySelectorAll('.location-testimonial')[centerIndex]?.classList.add('is-center');
    renderDots();
  };
  locationCarousel.querySelector('[data-carousel-prev]')?.addEventListener('click',()=>showTestimonial(active-1));
  locationCarousel.querySelector('[data-carousel-next]')?.addEventListener('click',()=>showTestimonial(active+1));
  let touchStartX=0;
  let touchStartY=0;
  locationCarousel.addEventListener('touchstart',event=>{
    const touch=event.changedTouches[0];
    touchStartX=touch.clientX;
    touchStartY=touch.clientY;
  },{passive:true});
  locationCarousel.addEventListener('touchend',event=>{
    const touch=event.changedTouches[0];
    const deltaX=touch.clientX-touchStartX;
    const deltaY=touch.clientY-touchStartY;
    if(window.matchMedia('(max-width: 800px)').matches&&Math.abs(deltaX)>42&&Math.abs(deltaX)>Math.abs(deltaY)*1.25){
      showTestimonial(active+(deltaX<0?1:-1));
    }
  },{passive:true});
  showTestimonial(0);
  window.addEventListener('resize',()=>showTestimonial(Math.min(active,maxIndex())),{passive:true});
}
