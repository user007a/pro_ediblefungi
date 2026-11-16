
/* ============================================================
   0. 舞台缩放 + 顶栏时钟
   ============================================================ */
(function(){
  var stage=document.getElementById('stage');
  function fit(){
    var k=Math.min(innerWidth/1920,innerHeight/1080);
    stage.style.transform='translate(-50%,-50%) scale('+k+')';
  }
  addEventListener('resize',fit);fit();
})();

(function(){
  var w=['周日','周一','周二','周三','周四','周五','周六'];
  var p=function(n){return ('0'+n).slice(-2);};
  function tick(){
    var d=new Date();
    document.getElementById('clk').textContent=p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds());
    document.getElementById('dt').textContent=d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+' '+w[d.getDay()];
  }
  tick();setInterval(tick,1000);
})();

/* ============================================================
   1. 通用 SVG 图表（手写，无图表库）
   ============================================================ */
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function fmt(v){
  if(Math.abs(v)>=1000) return (v/1000).toFixed(v%1000===0?0:1)+'k';
  return Math.round(v);
}
function linePath(pts){
  if(pts.length<2) return '';
  var d='M'+pts[0][0].toFixed(1)+','+pts[0][1].toFixed(1);
  for(var i=0;i<pts.length-1;i++){
    var p0=pts[i-1]||pts[i],p1=pts[i],p2=pts[i+1],p3=pts[i+2]||p2;
    var c1x=p1[0]+(p2[0]-p0[0])/6,c1y=p1[1]+(p2[1]-p0[1])/6;
    var c2x=p2[0]-(p3[0]-p1[0])/6,c2y=p2[1]-(p3[1]-p1[1])/6;
    d+=' C'+c1x.toFixed(1)+','+c1y.toFixed(1)+' '+c2x.toFixed(1)+','+c2y.toFixed(1)+' '+p2[0].toFixed(1)+','+p2[1].toFixed(1);
  }
  return d;
}
var chartSeq=0;
var chartTip=document.createElement('div');
chartTip.id='chartTip';
document.body.appendChild(chartTip);
function showTip(html,x,y){
  chartTip.innerHTML=html;
  chartTip.classList.add('on');
  var w=chartTip.offsetWidth,h=chartTip.offsetHeight;
  var lx=Math.max(8,Math.min(window.innerWidth-w-8,x+14));
  var ly=y-h-14;
  if(ly<8) ly=y+20;
  chartTip.style.left=lx+'px';
  chartTip.style.top=ly+'px';
}
function hideTip(){chartTip.classList.remove('on');}
document.addEventListener('mousemove',function(e){
  var el=e.target;
  while(el&&el!==document&&!(el.getAttribute&&el.getAttribute('data-tip'))) el=el.parentNode;
  if(el&&el.getAttribute&&el.getAttribute('data-tip')){
    showTip(el.getAttribute('data-tip'),e.clientX,e.clientY);
  }else if(e.target.closest&&!e.target.closest('.chart')){
    hideTip();
  }
});
document.addEventListener('mouseleave',hideTip);

function lineChart(host,cfg){
  if(!host) return;
  var w=host.clientWidth||360,h=host.clientHeight||120;
  if(w<40||h<40) return;
  var pad={l:(cfg.padL===undefined?30:cfg.padL),r:6,t:8,b:16};
  var iw=w-pad.l-pad.r,ih=h-pad.t-pad.b;
  var n=cfg.labels.length;
  var X=function(i){return pad.l+iw*i/(n-1);};
  var id='cg'+(++chartSeq);
  var out='<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img">';
  out+='<defs>';
  (cfg.series||[]).forEach(function(s,k){
    out+='<linearGradient id="'+id+'-'+k+'" x1="0" y1="0" x2="0" y2="1">'+
      '<stop offset="0" stop-color="'+s.color+'" stop-opacity=".38"/>'+
      '<stop offset="1" stop-color="'+s.color+'" stop-opacity="0"/></linearGradient>';
  });
  out+='</defs>';
  /* 网格 */
  for(var g=0;g<=3;g++){
    var gy=pad.t+ih*g/3;
    out+='<line x1="'+pad.l+'" y1="'+gy.toFixed(1)+'" x2="'+(w-pad.r)+'" y2="'+gy.toFixed(1)+
      '" stroke="rgba(110,170,255,.12)" stroke-dasharray="'+(g===3?'0':'3 4')+'"/>';
  }
  /* Y 轴刻度（取第一条系列） */
  var s0=cfg.series[0],mn0=s0.min, mx0=s0.max;
  if(!cfg.hideY){
    for(var yt=0;yt<=2;yt++){
      var val=mx0-(mx0-mn0)*yt/2;
      var yy=pad.t+ih*yt/2;
      out+='<text x="'+(pad.l-5)+'" y="'+(yy+3).toFixed(1)+'" text-anchor="end" font-size="8.5" fill="rgba(157,184,220,.7)">'+
        (cfg.yFmt?cfg.yFmt(val):fmt(val))+'</text>';
    }
  }
  /* X 轴标签 */
  cfg.labels.forEach(function(lb,i){
    if(!lb) return;
    out+='<text x="'+X(i).toFixed(1)+'" y="'+(h-4)+'" text-anchor="middle" font-size="8.5" fill="rgba(157,184,220,.72)">'+lb+'</text>';
  });
  /* 系列 */
  (cfg.series||[]).forEach(function(s,k){
    var pts=s.data.map(function(v,i){
      var t=(v-s.min)/(s.max-s.min||1);
      return [X(i),pad.t+ih*(1-clamp(t,0,1))];
    });
    if(s.type==='area'){
      var base=pad.t+ih;
      out+='<path d="'+linePath(pts.map(function(p){return [p[0],base];}))+' L'+pts[pts.length-1][0].toFixed(1)+','+base.toFixed(1)+' Z" fill="none"/>';
      out+='<path class="lc-area" d="'+linePath(pts)+' L'+pts[pts.length-1][0].toFixed(1)+','+base+' L'+pts[0][0].toFixed(1)+','+base+' Z" fill="url(#'+id+'-'+k+')"/>';
    }
    out+='<path class="lc-line" d="'+linePath(pts)+'" fill="none" stroke="'+s.color+'" stroke-width="'+(s.width||1.7)+
      '" stroke-linecap="round" stroke-linejoin="round"'+(s.type==='area'?' opacity="1"':'')+'/>';
    out+='<circle class="lc-pulse" cx="'+pts[pts.length-1][0].toFixed(1)+'" cy="'+pts[pts.length-1][1].toFixed(1)+
      '" r="3" fill="'+s.color+'" opacity=".9"/>';
    if(s.dot){
      out+='<circle cx="'+pts[pts.length-1][0].toFixed(1)+'" cy="'+pts[pts.length-1][1].toFixed(1)+
        '" r="2.6" fill="'+s.color+'" stroke="#071426" stroke-width="1.2"/>';
    }
  });
  out+='<g class="lc-hover" style="opacity:0"><line y1="'+pad.t+'" y2="'+(pad.t+ih)+'" stroke="rgba(120,220,255,.55)" stroke-dasharray="3 3"/>';
  (cfg.series||[]).forEach(function(s){
    out+='<circle r="3.4" fill="'+s.color+'" stroke="#071426" stroke-width="1.2"/>';
  });
  out+='</g><rect class="lc-hit" x="0" y="0" width="'+w+'" height="'+h+'" fill="transparent" pointer-events="all"/>';
  out+='</svg>';
  host.innerHTML=out;
  var svg=host.querySelector('svg');
  if(!svg||n<2) return;
  var hovG=svg.querySelector('.lc-hover'),hitR=svg.querySelector('.lc-hit');
  var gline=hovG.querySelector('line'),dots=hovG.querySelectorAll('circle');
  hitR.addEventListener('mousemove',function(ev){
    var r=svg.getBoundingClientRect();
    var idx=Math.round(((ev.clientX-r.left)/r.width*w-pad.l)/iw*(n-1));
    idx=Math.max(0,Math.min(n-1,idx));
    gline.setAttribute('x1',X(idx));gline.setAttribute('x2',X(idx));
    var h='<div class="t-hd">'+cfg.labels[idx]+'</div>';
    (cfg.series||[]).forEach(function(s,k){
      var t=(s.data[idx]-s.min)/(s.max-s.min||1);
      var yy=pad.t+ih*(1-clamp(t,0,1));
      if(dots[k]){dots[k].setAttribute('cx',X(idx));dots[k].setAttribute('cy',yy);}
      h+='<div class="t-row"><i style="background:'+s.color+'"></i><span>'+(s.name||'数值')+'</span><b>'+fmt(s.data[idx])+'</b></div>';
    });
    hovG.style.opacity=1;
    showTip(h,ev.clientX,ev.clientY);
  });
  hitR.addEventListener('mouseleave',function(){hovG.style.opacity=0;hideTip();});
}

function barChart(host,cfg){
  if(!host) return;
  var w=host.clientWidth||360,h=host.clientHeight||100;
  if(w<40||h<40) return;
  var pad={l:26,r:6,t:8,b:16};
  var iw=w-pad.l-pad.r,ih=h-pad.t-pad.b;
  var n=cfg.labels.length,step=iw/n;
  var max=Math.max.apply(null,cfg.bars)*1.15;
  var lineMin=Math.min.apply(null,cfg.line)*0.9,lineMax=Math.max.apply(null,cfg.line)*1.05;
  var bw=Math.min(18,step*0.38);
  var out='<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'">';
  out+='<defs><linearGradient id="barG" x1="0" y1="0" x2="0" y2="1">'+
    '<stop offset="0" stop-color="#4FA8FF"/><stop offset="1" stop-color="#1D4E9C"/></linearGradient></defs>';
  for(var g=0;g<=3;g++){
    var gy=pad.t+ih*g/3;
    out+='<line x1="'+pad.l+'" y1="'+gy.toFixed(1)+'" x2="'+(w-pad.r)+'" y2="'+gy.toFixed(1)+
      '" stroke="rgba(110,170,255,.11)" stroke-dasharray="'+(g===3?'0':'3 4')+'"/>';
  }
  var pts=[];
  cfg.labels.forEach(function(lb,i){
    var cx=pad.l+step*(i+0.5);
    var bh=ih*(cfg.bars[i]/max);
    var tip=lb+'：'+cfg.bars[i]+(cfg.unit||'')+(cfg.line?'　指标 '+cfg.line[i]:'');
    out+='<rect x="'+(cx-step/2).toFixed(1)+'" y="'+pad.t+'" width="'+step.toFixed(1)+'" height="'+ih+
      '" fill="transparent" data-tip="'+tip+'"/>';
    out+='<rect class="bc-bar" data-tip="'+tip+'" style="animation-delay:'+(i*55)+'ms" x="'+(cx-bw/2).toFixed(1)+'" y="'+(pad.t+ih-bh).toFixed(1)+'" width="'+bw.toFixed(1)+
      '" height="'+bh.toFixed(1)+'" rx="2" fill="url(#barG)" opacity=".95"/>';
    out+='<text x="'+cx.toFixed(1)+'" y="'+(h-4)+'" text-anchor="middle" font-size="8" fill="rgba(157,184,220,.72)">'+lb+'</text>';
    var lt=(cfg.line[i]-lineMin)/(lineMax-lineMin||1);
    pts.push([cx,pad.t+ih*(1-clamp(lt,0,1))]);
  });
  out+='<path d="'+linePath(pts)+'" fill="none" stroke="#38D6FF" stroke-width="1.6" stroke-linecap="round"/>';
  pts.forEach(function(p){out+='<circle cx="'+p[0].toFixed(1)+'" cy="'+p[1].toFixed(1)+'" r="2.2" fill="#38D6FF" stroke="#071426" stroke-width="1"/>';});
  out+='</svg>';
  host.innerHTML=out;
}

function donutSVG(pct,color,size,sw){
  var r=(size-sw)/2,c=2*Math.PI*r;
  return '<svg viewBox="0 0 '+size+' '+size+'" width="'+size+'" height="'+size+'">'+
    '<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="rgba(110,170,255,.14)" stroke-width="'+sw+'"/>'+
    '<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="'+sw+
    '" stroke-linecap="round" stroke-dasharray="'+(c*pct/100).toFixed(1)+' '+c.toFixed(1)+
    '" transform="rotate(-90 '+size/2+' '+size/2+')" style="filter:drop-shadow(0 0 5px '+color+'99)"/>'+
    '</svg>';
}

/* ============================================================
   2. 面板图表数据
   ============================================================ */
var LAB24=['00:00','','04:00','','08:00','','12:00','','16:00','','20:00','','24:00'];

function buildCharts(){
  lineChart(document.getElementById('chartEnv'),{
    labels:LAB24,
    yFmt:function(v){return v.toFixed(0);},
    series:[
      {data:[690,705,700,680,665,672,690,712,724,706,694,686,685],min:400,max:900,color:'#2bd46e',type:'area',width:1.4},
      {data:[17.6,17.9,18.1,18.6,19.0,19.4,19.8,19.5,19.0,18.8,18.6,18.5,18.4],min:14,max:24,color:'#38D6FF'},
      {data:[91.2,91.8,92.4,92.9,93.1,93.0,92.7,92.5,92.4,92.3,92.2,92.3,92.3],min:84,max:96,color:'#F2B33D'}
    ]
  });
  lineChart(document.getElementById('chartCo2'),{
    labels:LAB24,
    hideY:false,
    yFmt:function(v){return v.toFixed(0);},
    series:[
      {data:[612,648,690,704,678,660,639,652,671,694,708,692,685],min:520,max:780,color:'#2bd46e',type:'area',width:1.4},
      {data:[17.4,17.7,18.0,18.5,19.1,19.6,20.0,19.6,19.1,18.8,18.6,18.5,18.4],min:14,max:24,color:'#38D6FF'}
    ]
  });
  lineChart(document.getElementById('chartEnergy'),{
    labels:['00:00','','','06:00','','','12:00','','','18:00','','','24:00'],
    padL:30,
    yFmt:function(v){return v.toFixed(0);},
    series:[
      {data:[1120,1010,940,980,1180,1460,1680,1720,1610,1490,1380,1240,1080],min:800,max:1900,color:'#2bd46e',type:'area',width:1.3},
      {data:[1180,1060,970,1020,1240,1520,1740,1780,1660,1540,1420,1300,1120],min:800,max:1900,color:'#38D6FF',width:1.7,dot:true}
    ]
  });
  barChart(document.getElementById('chartYield'),{
    labels:['01-04','01-05','01-06','01-07','01-08'],
    bars:[2860,3120,2980,3340,3245],
    line:[3020,3180,3260,3410,3390]
  });
}

/* ============================================================
   3. 环形图 / CO₂ 仪表 / 视频宫格
   ============================================================ */
document.getElementById('donutHouse').innerHTML=donutSVG(78,'#38D6FF',96,8);
document.getElementById('donutProd').innerHTML=donutSVG(82,'#38D6FF',84,7);

function renderGauge(val,status,hostId){
  var max=1200,r=76,cx=100,cy=112;
  var len=Math.PI*r;
  var pct=clamp(val/max,0,1);
  var col=status==='正常'?'#2bd46e':status==='预警'?'#F2B33D':'#E5564B';
  var out='<svg viewBox="0 0 200 128">';
  out+='<path d="M'+(cx-r)+' '+cy+' A'+r+' '+r+' 0 0 1 '+(cx+r)+' '+cy+'" fill="none" stroke="rgba(110,170,255,.16)" stroke-width="9" stroke-linecap="round"/>';
  out+='<path d="M'+(cx-r)+' '+cy+' A'+r+' '+r+' 0 0 1 '+(cx+r)+' '+cy+'" fill="none" stroke="'+col+'" stroke-width="9" stroke-linecap="round" '+
    'stroke-dasharray="'+(len*pct).toFixed(1)+' '+len.toFixed(1)+'" style="filter:drop-shadow(0 0 6px '+col+'99)"/>';
  for(var i=0;i<=10;i++){
    var a=Math.PI-Math.PI*i/10;
    var x1=cx+(r-12)*Math.cos(a),y1=cy-(r-12)*Math.sin(a);
    var x2=cx+(r-6)*Math.cos(a),y2=cy-(r-6)*Math.sin(a);
    out+='<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+'" stroke="rgba(110,170,255,.45)" stroke-width="1"/>';
  }
  out+='<text x="'+cx+'" y="86" text-anchor="middle" font-size="30" font-weight="700" fill="'+col+'" font-family="DIN Alternate,Bahnschrift,Segoe UI,sans-serif" style="filter:drop-shadow(0 0 8px '+col+'66)">'+val+'</text>';
  out+='<text x="'+cx+'" y="101" text-anchor="middle" font-size="9.5" fill="#8AA0BE">ppm · 二氧化碳浓度</text>';
  out+='<text x="'+(cx-r)+'" y="126" text-anchor="middle" font-size="8" fill="rgba(157,184,220,.6)">0</text>';
  out+='<text x="'+(cx+r)+'" y="126" text-anchor="middle" font-size="8" fill="rgba(157,184,220,.6)">1,200</text>';
  out+='</svg>';
  document.getElementById(hostId||'gauge').innerHTML=out;
}
renderGauge(685,'正常');

(function(){
  var names=[
    ['1号出菇房',1,0],['2号出菇房',1,1],['3号出菇房',0,1],
    ['冷链包装区',1,2],['冷链暂存区',1,3],['分级预包装区',1,4]
  ];
  function frame(type){
    var s='<svg viewBox="0 0 120 54" preserveAspectRatio="none">';
    s+='<rect width="120" height="54" fill="#061224"/>';
    /* 顶部灯带 */
    s+='<rect x="0" y="0" width="120" height="6" fill="rgba(56,214,255,.07)"/>';
    if(type===0){ /* 多层菇架 */
      for(var r=0;r<3;r++){
        var y=12+r*13;
        s+='<rect x="2" y="'+y+'" width="116" height="9" fill="rgba(28,72,110,.55)"/>';
        for(var i=0;i<9;i++){
          s+='<rect x="'+(4+i*13)+'" y="'+(y+2)+'" width="9" height="5" rx="1" fill="rgba(205,225,235,.5)"/>';
          if((i+r)%3===0) s+='<rect x="'+(4+i*13)+'" y="'+(y+1.2)+'" width="9" height="2" rx="1" fill="rgba(232,240,245,.65)"/>';
        }
      }
    }else if(type===1){ /* 走道纵深 */
      s+='<polygon points="0,54 34,10 86,10 120,54" fill="rgba(22,62,96,.5)"/>';
      s+='<polygon points="34,10 42,4 78,4 86,10" fill="rgba(56,214,255,.12)"/>';
      for(var z=0;z<3;z++){
        s+='<rect x="'+(36+z*3)+'" y="'+(14+z*10)+'" width="'+(48-z*6)+'" height="5" fill="rgba(200,225,240,.28)"/>';
      }
      s+='<path d="M40 54 L46 12 M80 54 L74 12" stroke="rgba(56,214,255,.25)" stroke-width="1"/>';
    }else{ /* 冷库货箱 */
      for(var k=0;k<3;k++){
        s+='<rect x="'+(6+k*38)+'" y="20" width="32" height="26" rx="2" fill="rgba(70,120,165,.35)" stroke="rgba(140,200,255,.3)"/>';
        s+='<rect x="'+(12+k*38)+'" y="26" width="20" height="14" fill="rgba(160,205,235,.22)"/>';
      }
      s+='<rect x="0" y="46" width="120" height="8" fill="rgba(20,52,84,.6)"/>';
    }
    s+='<line x1="0" y1="54" x2="120" y2="54" stroke="rgba(56,214,255,.2)"/>';
    s+='<text x="116" y="10" text-anchor="end" font-size="5" fill="rgba(157,184,220,.65)" font-family="monospace">2026-11-16 10:22:35</text>';
    s+='</svg>';
    return s;
  }
  var box=document.getElementById('vgrid');
  box.innerHTML=names.map(function(n,i){
    return '<div class="vcell">'+frame(n[2])+
      '<span class="vd'+(n[1]?'':' off')+'"></span>'+
      '<span class="vn">'+n[0]+'</span></div>';
  }).join('');
})();

/* ============================================================
   4. 中央 3D 厂区鸟瞰（等轴测 · 可旋转 / 缩放 / 点击建筑）
   ============================================================ */
(function(){
  var svg=document.getElementById('campus');
  var root=document.getElementById('sceneRoot');
  var tip=document.getElementById('bTip');
  var W=1048,H=748,U=44,CEN={x:6.2,y:4.4};
  var rot=0,tilt=.58,zoom=1.04;
  var dragging=false,moved=0,sx=0,sy=0,rot0=0,tilt0=0;

  var buildings=[
    {code:'GF-01',name:'1号出菇房',x:.5,y:.5,w:2.25,d:1.5,h:1.15,status:'ok',st:'出菇期',temp:'18.2',hum:'92.5',co2:'672'},
    {code:'GF-02',name:'2号出菇房',x:3.35,y:.5,w:2.25,d:1.5,h:1.15,status:'ok',st:'出菇期',temp:'18.6',hum:'91.8',co2:'688'},
    {code:'GF-03',name:'3号出菇房',x:6.2,y:.5,w:2.25,d:1.5,h:1.15,status:'warn',st:'催蕾期',temp:'19.1',hum:'88.4',co2:'742'},
    {code:'GF-04',name:'4号出菇房',x:9.05,y:.5,w:2.25,d:1.5,h:1.15,status:'risk',st:'出菇期',temp:'21.4',hum:'85.2',co2:'806'},
    {code:'PY-02',name:'2号培养房',x:.9,y:3.25,w:2.7,d:1.55,h:.95,status:'ok',st:'发菌期',temp:'22.4',hum:'72.6',co2:'980'},
    {code:'MJ',name:'灭菌中心',x:4.75,y:3.2,w:2.25,d:1.55,h:1.3,status:'ok',st:'运行中',temp:'26.8',hum:'62.4',co2:'520'},
    {code:'FJ',name:'分级包装区',x:8.05,y:3.25,w:2.55,d:1.55,h:1.02,status:'warn',st:'包装中',temp:'17.2',hum:'58.6',co2:'468'},
    {code:'BG',name:'联合办公楼',x:4.35,y:5.95,w:2.45,d:1.4,h:1.12,status:'ok',st:'办公',temp:'23.4',hum:'54.2',co2:'620'},
    {code:'LL',name:'冷链食品区',x:8.15,y:6.0,w:2.45,d:1.3,h:.92,status:'ok',st:'−2℃ 冷库',temp:'-2.0',hum:'88.0',co2:'430'}
  ];

  function P(x,y,z){
    z=z||0;
    var dx=x-CEN.x,dy=y-CEN.y,ca=Math.cos(rot),sa=Math.sin(rot);
    var rx=dx*ca-dy*sa+CEN.x,ry=dx*sa+dy*ca+CEN.y;
    return [(rx-ry)*0.866*U,(rx+ry)*tilt*U-z*U*0.92];
  }
  function depth(x,y){
    var dx=x-CEN.x,dy=y-CEN.y,ca=Math.cos(rot),sa=Math.sin(rot);
    return (dx*ca-dy*sa)+(dx*sa+dy*ca);
  }
  function poly(pts,attr){
    return '<polygon points="'+pts.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' ')+'" '+attr+'/>';
  }
  function line(a,b,attr){
    return '<line x1="'+a[0].toFixed(1)+'" y1="'+a[1].toFixed(1)+'" x2="'+b[0].toFixed(1)+'" y2="'+b[1].toFixed(1)+'" '+attr+'/>';
  }
  function statusColor(s){
    return s==='ok'?'#2bd46e':s==='warn'?'#F2B33D':s==='risk'?'#E5564B':'#8AA0BE';
  }

  function box(cx,cy,w,d,h,z,fillTop,fillL,fillR){
    var a=P(cx-w/2,cy-d/2,z+h),b=P(cx+w/2,cy-d/2,z+h),c=P(cx+w/2,cy+d/2,z+h),dd=P(cx-w/2,cy+d/2,z+h);
    var a0=P(cx-w/2,cy-d/2,z),b0=P(cx+w/2,cy-d/2,z),c0=P(cx+w/2,cy+d/2,z),d0=P(cx-w/2,cy+d/2,z);
    return poly([dd,c,c0,d0],'fill="'+fillL+'"')+
           poly([b,c,c0,b0],'fill="'+fillR+'"')+
           poly([a,b,c,dd],'fill="'+fillTop+'"');
  }

  function buildingHTML(b){
    var x=b.x,y=b.y,w=b.w,d=b.d,h=b.h;
    var A=P(x,y,h),B=P(x+w,y,h),C=P(x+w,y+d,h),D=P(x,y+d,h);
    var A0=P(x,y,0),B0=P(x+w,y,0),C0=P(x+w,y+d,0),D0=P(x,y+d,0);
    var col=statusColor(b.status);
    var s='';
    /* 地面投影 */
    s+=poly([A0,B0,C0,D0],'fill="rgba(0,0,0,.42)" filter="url(#f-soft)"');
    /* 立面 */
    s+=poly([D,C,C0,D0],'fill="url(#g-faceL)" stroke="rgba(56,214,255,.14)" stroke-width=".8"');
    s+=poly([B,C,C0,B0],'fill="url(#g-faceR)" stroke="rgba(56,214,255,.12)" stroke-width=".8"');
    /* 屋面板 */
    s+=poly([A,B,C,D],'fill="url(#g-roof)" stroke="rgba(140,215,255,.78)" stroke-width="1.3"');
    /* 立面窗带 */
    var rows=2,stepY=(h-0.28)/rows;
    for(var r=0;r<rows;r++){
      var z1=0.18+r*stepY,z2=z1+Math.min(0.13,stepY*0.55);
      var nW=Math.max(3,Math.round(w/0.42));
      for(var i=0;i<nW;i++){
        var xa=x+0.16+i*(w-0.32)/nW,xb=xa+(w-0.32)/nW*0.62;
        s+=poly([P(xa,y+d,z1),P(xb,y+d,z1),P(xb,y+d,z2),P(xa,y+d,z2)],
          'fill="rgba(130,215,255,'+(b.status==='risk'?.58:.46)+')"');
      }
      var nD=Math.max(2,Math.round(d/0.42));
      for(var j=0;j<nD;j++){
        var ya=y+0.16+j*(d-0.32)/nD,yb=ya+(d-0.32)/nD*0.62;
        s+=poly([P(x+w,ya,z1),P(x+w,yb,z1),P(x+w,yb,z2),P(x+w,ya,z2)],
          'fill="rgba(130,215,255,'+(b.status==='risk'?.48:.38)+')"');
      }
    }
    /* 顶部设备 */
    s+=box(x+w*0.28,y+d*0.34,0.42,0.34,0.16,h,'#1E4A6C','#133249','#0F283C');
    s+=box(x+w*0.66,y+d*0.6,0.34,0.3,0.13,h,'#1E4A6C','#133249','#0F283C');
    /* 顶部轮廓高光 */
    s+=line(A,B,'stroke="'+col+'" stroke-width="1.5" opacity=".8" style="filter:url(#f-glow)"');
    /* 角柱 */
    s+=line(A,A0,'stroke="rgba(56,214,255,.35)" stroke-width="1"');
    s+=line(B,B0,'stroke="rgba(56,214,255,.28)" stroke-width="1"');
    s+=line(C,C0,'stroke="rgba(56,214,255,.22)" stroke-width="1"');
    /* 告警脉冲 */
    if(b.status==='warn'||b.status==='risk'){
      var cbase=P(x+w/2,y+d/2,0);
      s+='<circle cx="'+cbase[0].toFixed(1)+'" cy="'+cbase[1].toFixed(1)+'" r="4" fill="none" stroke="'+col+'" stroke-width="1.4">'+
        '<animate attributeName="r" values="4;15" dur="1.9s" repeatCount="indefinite"/>'+
        '<animate attributeName="opacity" values=".85;0" dur="1.9s" repeatCount="indefinite"/></circle>';
    }
    return s;
  }

  function labelHTML(b){
    var cx=b.x+b.w/2,cy=b.y+b.d/2;
    var p=P(cx,cy,b.h);
    var ly=p[1]-42, col=statusColor(b.status);
    var tw=b.name.length*11.4+26;
    var s='';
    s+=line([p[0],p[1]-8],[p[0],ly+11],'stroke="rgba(140,210,255,.8)" stroke-width="1.2" stroke-dasharray="3 3"');
    s+='<circle cx="'+p[0].toFixed(1)+'" cy="'+(p[1]-7).toFixed(1)+'" r="2.4" fill="'+col+'" opacity=".9"/>';
    s+='<rect x="'+(p[0]-tw/2).toFixed(1)+'" y="'+(ly-11).toFixed(1)+'" width="'+tw.toFixed(1)+'" height="22" rx="11" '+
       'fill="rgba(9,27,52,.92)" stroke="'+col+'" stroke-opacity=".55"/>';
    s+='<circle cx="'+(p[0]-tw/2+11).toFixed(1)+'" cy="'+ly+'" r="2.6" fill="'+col+'"/>';
    s+='<text x="'+(p[0]+6).toFixed(1)+'" y="'+(ly+4).toFixed(1)+'" text-anchor="middle" font-size="11.5" fill="#DFF3FF">'+b.name+'</text>';
    return s;
  }

  function tree(x,y,size){
    var base=P(x,y,0);
    var topY=base[1]-size*U*0.9;
    var r=size*U*0.26;
    return '<g opacity=".9">'+
      '<line x1="'+base[0].toFixed(1)+'" y1="'+base[1].toFixed(1)+'" x2="'+base[0].toFixed(1)+'" y2="'+topY.toFixed(1)+'" stroke="#1B5A46" stroke-width="1.6"/>'+
      '<ellipse cx="'+base[0].toFixed(1)+'" cy="'+(topY-r*0.4).toFixed(1)+'" rx="'+r.toFixed(1)+'" ry="'+(r*1.05).toFixed(1)+'" fill="url(#g-tree)" opacity=".92"/>'+
      '<ellipse cx="'+(base[0]-r*0.3).toFixed(1)+'" cy="'+(topY-r*0.7).toFixed(1)+'" rx="'+(r*0.5).toFixed(1)+'" ry="'+(r*0.4).toFixed(1)+'" fill="rgba(120,230,170,.25)"/>'+
      '</g>';
  }

  function truck(x,y){
    var body=box(x,y,0.98,0.44,0.4,0,'#DCEAF6','#B9CFE2','#8DA6BC');
    var cab=box(x+0.62,y,0.32,0.44,0.3,0,'#EAF4FF','#C9DCEB','#9FB6C9');
    var base=P(x,y+0.44,.02);
    return '<g>'+body+cab+
      '<circle cx="'+(base[0]-7).toFixed(1)+'" cy="'+(base[1]-2).toFixed(1)+'" r="2.2" fill="#1a2c40"/>'+
      '<circle cx="'+(base[0]+7).toFixed(1)+'" cy="'+(base[1]-2).toFixed(1)+'" r="2.2" fill="#1a2c40"/>'+
      '<circle cx="'+(base[0]-7).toFixed(1)+'" cy="'+(base[1]-2).toFixed(1)+'" r="1" fill="#E5564B" opacity=".9"/>'+
      '</g>';
  }

  function wrap(b,inner){
    return '<g class="bld" style="cursor:pointer" data-code="'+b.code+'" data-name="'+b.name+
      '" data-status="'+b.status+'" data-temp="'+b.temp+'" data-hum="'+b.hum+'" data-co2="'+b.co2+
      '" data-st="'+b.st+'">'+inner+'</g>';
  }

  function render(){
    var ca=Math.cos(rot),sa=Math.sin(rot);
    var parts=[];
    /* 地台 */
    var G=[P(-1.6,-1.6),P(13.4,-1.6),P(13.4,9.7),P(-1.6,9.7)];
    parts.push(poly(G,'fill="url(#g-ground)" stroke="rgba(56,214,255,.25)" stroke-width="1.2"'));
    /* 地台网格 */
    for(var gx=0;gx<=12;gx+=2){
      parts.push(line(P(gx,-1.2),P(gx,9.3),'stroke="rgba(56,214,255,.06)" stroke-width=".7"'));
    }
    for(var gy=0;gy<=9;gy+=2){
      parts.push(line(P(-1.2,gy),P(13,gy),'stroke="rgba(56,214,255,.06)" stroke-width=".7"'));
    }
    /* 绿化带 */
    parts.push(poly([P(.2,1.95),P(12.7,1.95),P(12.7,2.15),P(.2,2.15)],'fill="rgba(43,212,110,.13)"'));
    parts.push(poly([P(.4,4.82),P(12.7,4.82),P(12.7,4.96),P(.4,4.96)],'fill="rgba(43,212,110,.1)"'));
    parts.push(poly([P(6.9,7.36),P(12.9,7.36),P(12.9,7.46),P(6.9,7.46)],'fill="rgba(43,212,110,.12)"'));

    /* 道路 */
    function road(x1,y1,x2,y2,main){
      var p1=P(x1,y1),p2=P(x2,y1),p3=P(x2,y2),p4=P(x1,y2);
      var s=poly([p1,p2,p3,p4],'fill="'+(main?'#0B1B31':'#0A192C')+'" stroke="rgba(56,214,255,.12)" stroke-width=".8"');
      var midY=(y1+y2)/2;
      s+=line(P(x1+0.2,midY),P(x2-0.2,midY),'stroke="rgba(160,205,255,.3)" stroke-width="1" stroke-dasharray="7 8"');
      return s;
    }
    parts.push(road(-0.6,2.2,12.9,3.05,false));
    parts.push(road(0.4,4.95,12.9,5.72,false));
    parts.push(road(-1.2,7.45,13.2,8.5,true));
    parts.push(road(3.5,3.05,4.3,4.95,false));
    /* 停车场 */
    parts.push(poly([P(9.6,8.72),P(13,8.72),P(13,9.45),P(9.6,9.45)],'fill="#0A192C" stroke="rgba(56,214,255,.12)"'));
    for(var px=9.9;px<12.95;px+=0.55){
      parts.push(line(P(px,8.85),P(px,9.3),'stroke="rgba(160,205,255,.22)" stroke-width="1"'));
    }
    /* 广场 */
    parts.push(poly([P(4.6,7.5),P(7.0,7.5),P(7.0,8.3),P(4.6,8.3)],'fill="rgba(30,72,116,.35)" stroke="rgba(56,214,255,.1)"'));

    /* 路灯（沿三条主路的双向灯带） */
    [[2.14,3.12],[4.88,5.78],[7.4,8.56]].forEach(function(ys){
      for(var lx=0.2;lx<=12.5;lx+=1.3){
        ys.forEach(function(ly){
          var q=P(lx,ly,0.01);
          parts.push('<circle cx="'+q[0].toFixed(1)+'" cy="'+q[1].toFixed(1)+'" r="2.8" fill="rgba(127,232,255,.16)"/>');
          parts.push('<circle cx="'+q[0].toFixed(1)+'" cy="'+q[1].toFixed(1)+'" r="1" fill="#9FEBFF" opacity=".85"/>');
        });
      }
    });

    /* 深度排序物件（树 / 建筑 / 货车） */
    var items=[];
    buildings.forEach(function(b){
      items.push({d:depth(b.x+b.w/2,b.y+b.d/2)+1e-3,html:wrap(b,buildingHTML(b))});
    });
    var trees=[[0.15,1.85,.5],[2.8,1.9,.45],[5.55,1.82,.5],[8.35,1.86,.42],[11.35,1.8,.5],[12.35,2.6,.44],
      [0.25,3.9,.42],[3.9,4.15,.46],[6.95,4.55,.4],[11.6,4.1,.46],[12.5,4.5,.4],
      [0.3,5.75,.5],[3.1,6.95,.46],[7.0,7.15,.5],[11.85,6.1,.46],[12.6,6.9,.42],
      [0.35,8.1,.48],[6.35,8.9,.5],[9.95,9.2,.46],[12.2,7.6,.4],[2.3,9.1,.44],[8.7,9.15,.4]];
    trees.forEach(function(t){items.push({d:depth(t[0],t[1]),html:tree(t[0],t[1],t[2])});});
    items.push({d:depth(1.6,7.95)+.4,html:truck(1.55,7.78)});
    items.push({d:depth(4.6,7.95)+.4,html:truck(4.55,7.78)});
    items.sort(function(a,b){return a.d-b.d;});
    parts.push(items.map(function(i){return i.html;}).join(''));

    /* 标签层 */
    parts.push('<g class="labels">'+buildings.map(function(b){return wrap(b,labelHTML(b));}).join('')+'</g>');

    /* 建筑交互层：透明可点区域由建筑本身承担，此处包一层事件属性 */
    root.innerHTML=parts.join('');

    /* 适配画布 */
    var bb=root.getBBox();
    var padX=36,padY=30;
    var sc=Math.min((W-padX*2)/bb.width,(H-padY*2)/bb.height)*zoom;
    root.setAttribute('transform','translate('+((W-bb.width*sc)/2-bb.x*sc).toFixed(1)+','+
      ((H-bb.height*sc)/2-bb.y*sc).toFixed(1)+') scale('+sc.toFixed(4)+')');
  }
  render();

  /* 建筑点击 / 悬停 */
  function findBld(el){
    while(el&&el!==svg){
      if(el.classList&&el.classList.contains('bld')) return el;
      el=el.parentNode;
    }
    return null;
  }

  function showTip(el,ev){
    var d=el.dataset||{}; if(!d.name) return;
    var r=svg.getBoundingClientRect();
    tip.innerHTML='<div class="n"><i style="background:'+statusColor(d.status)+'"></i>'+d.name+'</div>'+
      '<div class="r"><span>温度</span><b>'+d.temp+'℃</b></div>'+
      '<div class="r"><span>湿度</span><b>'+d.hum+'%</b></div>'+
      '<div class="r"><span>CO₂</span><b>'+d.co2+' ppm</b></div>'+
      '<div class="t">'+d.st+' · 点击查看环境设备</div>';
    tip.classList.add('on');
    tip.style.left=(ev.clientX-r.left+12)+'px';
    tip.style.top=(ev.clientY-r.top-8)+'px';
  }
  function hideTip(){tip.classList.remove('on');}

  svg.addEventListener('pointermove',function(e){
    if(dragging){
      var dx=e.clientX-sx,dy=e.clientY-sy;
      moved=Math.max(moved,Math.abs(dx)+Math.abs(dy));
      rot=clamp(rot0+dx*0.004,-0.42,0.42);
      tilt=clamp(tilt0+dy*0.0009,0.5,0.76);
      render();hideTip();
      return;
    }
    var b=findBld(e.target);
    if(b) showTip(b,e); else hideTip();
  });
  svg.addEventListener('pointerdown',function(e){
    if(e.button!==0) return;
    dragging=true;moved=0;sx=e.clientX;sy=e.clientY;rot0=rot;tilt0=tilt;
    svg.classList.add('dragging');hideTip();
    if(svg.setPointerCapture) try{svg.setPointerCapture(e.pointerId);}catch(err){}
  });
  svg.addEventListener('pointerup',function(e){
    dragging=false;svg.classList.remove('dragging');
    if(svg.releasePointerCapture) try{svg.releasePointerCapture(e.pointerId);}catch(err){}
  });
  svg.addEventListener('pointerleave',function(){dragging=false;svg.classList.remove('dragging');hideTip();});
  svg.addEventListener('wheel',function(e){
    e.preventDefault();
    zoom=clamp(zoom+(e.deltaY>0?-0.07:0.07),0.75,1.55);
    render();
  },{passive:false});
  svg.addEventListener('dblclick',function(){reset();});
  svg.addEventListener('click',function(e){
    if(moved>7) return;
    var b=findBld(e.target);
    if(!b) return;
    if(window.__gotoHouse) window.__gotoHouse(b.dataset.name,b.dataset.code);
  });

  function reset(){rot=0;tilt=.58;zoom=1.04;render();}
  document.getElementById('resetView').addEventListener('click',reset);
})();

/* ============================================================
   5. 视图切换 · 顶栏交互
   ============================================================ */
var state={view:'overview',house:'',code:''};

var scene=document.getElementById('scene');
var envView=document.getElementById('envView');
var prodView=document.getElementById('prodView');
var energyView=document.getElementById('energyView');
var traceView=document.getElementById('traceView');
var videoView=document.getElementById('videoView');
var layoutEl=document.querySelector('.layout');
var bottomEl=document.querySelector('.bottom');
var tabs=Array.prototype.slice.call(document.querySelectorAll('.tab'));
var mode='map';

function syncURL(){
  var q='?view='+state.view;
  if(state.view==='env'&&state.house) q+='&house='+encodeURIComponent(state.house);
  try{history.replaceState(null,'',location.pathname+q);}catch(e){}
}

function applyView(v,opts){
  if(PAGE_VIEWS.indexOf(v)<0) v='overview';
  opts=opts||{};
  state.view=v;
  if(opts.house!==undefined) state.house=opts.house;
  if(opts.code!==undefined) state.code=opts.code;
  tabs.forEach(function(t){
    var on=t.dataset.view===v;
    t.classList.toggle('active',on);
    t.setAttribute('aria-selected',on?'true':'false');
  });
  var ov=(v==='overview');
  scene.hidden=!ov;
  envView.hidden=(v!=='env');
  prodView.hidden=(v!=='production');
  energyView.hidden=(v!=='energy');
  traceView.hidden=(v!=='trace');
  videoView.hidden=(v!=='video');
  layoutEl.hidden=!ov;
  bottomEl.hidden=!ov;
  if(v==='video'){
    buildVideoOnce();
  }else{
    stopTL();closeVF();
    if(v==='env'){
      if(!state.house) state.house='1号出菇房';
      renderEnv();
      updateEnvPanels();
      buildEnvPage();
    }else if(v==='production'){
      buildProdPage();
    }else if(v==='energy'){
      buildEnergyPage();
    }else if(v==='trace'){
      buildTracePage();
    }
  }
  syncURL();
}

tabs.forEach(function(t){
  t.addEventListener('click',function(){
    applyView(t.dataset.view,{house:''});
  });
});

window.__gotoHouse=function(name,code){
  applyView('env',{house:name,code:code});
};

/* 中央快捷切换：菇房分布图 / 今日产量趋势 */
var btnMap=document.getElementById('btnMap');
var btnYield=document.getElementById('btnYield');
function setMode(m){
  mode=m;
  btnMap.classList.toggle('on',m==='map');
  btnYield.classList.toggle('on',m==='yield');
  scene.classList.toggle('show-mini',m==='yield');
}
btnMap.addEventListener('click',function(){setMode('map');});
btnYield.addEventListener('click',function(){setMode('yield');});

/* CO₂ 详情 */
document.getElementById('co2Detail').addEventListener('click',function(){
  applyView('env',{house:'12号出菇房'});
});

/* 通风总控 / 分项开关 */
document.getElementById('powerBtn').addEventListener('click',function(){
  this.classList.toggle('off');
});
Array.prototype.forEach.call(document.querySelectorAll('.vbtn'),function(b){
  b.addEventListener('click',function(){b.classList.toggle('on');});
});

/* 全屏 */
document.getElementById('fsBtn').addEventListener('click',function(){
  if(!document.fullscreenElement){
    if(document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  }else if(document.exitFullscreen){
    document.exitFullscreen();
  }
});

/* ============================================================
   6. 环境设备 · 3D 菇房内景（走道 / 俯视）+ 菇房联动
   ============================================================ */
var ENV_MODE='aisle';
var HOUSES={
  '1号出菇房':{name:'1号出菇房',code:'GF-01',stage:'出菇期',temp:18.2,hum:92.5,co2:672,status:'正常',range:'400~800',dev:{total:32,run:28,idle:2,err:2}},
  '2号出菇房':{name:'2号出菇房',code:'GF-02',stage:'出菇期',temp:18.6,hum:91.8,co2:688,status:'正常',range:'400~800',dev:{total:30,run:27,idle:2,err:1}},
  '3号出菇房':{name:'3号出菇房',code:'GF-03',stage:'催蕾期',temp:19.1,hum:88.4,co2:742,status:'预警',range:'400~800',dev:{total:31,run:26,idle:2,err:3}},
  '4号出菇房':{name:'4号出菇房',code:'GF-04',stage:'出菇期',temp:21.4,hum:85.2,co2:806,status:'越限',range:'400~800',dev:{total:30,run:24,idle:2,err:4}},
  '12号出菇房':{name:'12号出菇房',code:'GF-12',stage:'出菇期',temp:18.4,hum:92.3,co2:685,status:'正常',range:'400~800',dev:{total:34,run:30,idle:2,err:2}}
};
function envData(name){return HOUSES[name]||HOUSES['1号出菇房'];}

function svgPoly(pts,attr){
  return '<polygon points="'+pts.map(function(p){return p[0].toFixed(1)+','+p[1].toFixed(1);}).join(' ')+'" '+attr+'/>';
}
function svgLine(a,b,attr){
  return '<line x1="'+a[0].toFixed(1)+'" y1="'+a[1].toFixed(1)+'" x2="'+b[0].toFixed(1)+'" y2="'+b[1].toFixed(1)+'" '+attr+'/>';
}
function envLabel(x,y,text,color){
  var w=text.length*11+34;
  return '<g><rect x="'+(x-w/2).toFixed(1)+'" y="'+(y-11)+'" width="'+w+'" height="22" rx="11" fill="rgba(9,27,52,.92)" stroke="'+(color||'#38D6FF')+'" stroke-opacity=".5"/>'+
    '<circle cx="'+(x-w/2+11).toFixed(1)+'" cy="'+y+'" r="2.5" fill="'+(color||'#38D6FF')+'"/>'+
    '<text x="'+(x+6).toFixed(1)+'" y="'+(y+4)+'" text-anchor="middle" font-size="10.5" fill="#DFF3FF">'+text+'</text></g>';
}
function envBubble(x,y,title,d){
  return '<g><rect x="'+x+'" y="'+y+'" width="174" height="62" rx="7" fill="rgba(7,20,38,.84)" stroke="rgba(56,214,255,.32)"/>'+
    '<text x="'+(x+10)+'" y="'+(y+16)+'" font-size="9.5" fill="#7FD8FF">'+title+'</text>'+
    '<text x="'+(x+10)+'" y="'+(y+31)+'" font-size="9" fill="#8AA0BE">温度</text>'+
    '<text x="'+(x+164)+'" y="'+(y+31)+'" text-anchor="end" font-size="10" fill="#DFF3FF">'+d.temp+' ℃</text>'+
    '<text x="'+(x+10)+'" y="'+(y+44)+'" font-size="9" fill="#8AA0BE">湿度</text>'+
    '<text x="'+(x+164)+'" y="'+(y+44)+'" text-anchor="end" font-size="10" fill="#DFF3FF">'+d.hum+' %</text>'+
    '<text x="'+(x+10)+'" y="'+(y+57)+'" font-size="9" fill="#8AA0BE">CO₂</text>'+
    '<text x="'+(x+164)+'" y="'+(y+57)+'" text-anchor="end" font-size="10" fill="#7FE8A8">'+d.co2+' ppm</text></g>';
}

function aisleSVG(d){
  var VPX=524,HZ=330,Z0=2.6;
  function zf(t){return 1/(1+Z0*t);}
  function FX(u,t){return VPX+u*zf(t);}
  function FY(t){return HZ+418*zf(t);}
  function CY(t){return HZ-250*zf(t);}
  var out='<defs>'+
    '<linearGradient id="e-bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#081a30"/><stop offset="1" stop-color="#04101f"/></linearGradient>'+
    '<linearGradient id="e-ceil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#061324"/><stop offset="1" stop-color="#0b2036"/></linearGradient>'+
    '<linearGradient id="e-wallL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0a1c30"/><stop offset="1" stop-color="#071627"/></linearGradient>'+
    '<linearGradient id="e-wallR" x1="1" y1="0" x2="0" y2="0"><stop offset="0" stop-color="#0a1c30"/><stop offset="1" stop-color="#071627"/></linearGradient>'+
    '<linearGradient id="e-floor" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#0c2238"/><stop offset=".6" stop-color="#081a2c"/><stop offset="1" stop-color="#061322"/></linearGradient>'+
    '<linearGradient id="e-back" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0e2740"/><stop offset="1" stop-color="#08182a"/></linearGradient>'+
    '<linearGradient id="e-door" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9FEBFF" stop-opacity=".45"/><stop offset="1" stop-color="#38D6FF" stop-opacity=".1"/></linearGradient>'+
    '<linearGradient id="e-steel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a4a63"/><stop offset="1" stop-color="#132a3e"/></linearGradient>'+
    '<linearGradient id="e-reflect" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#38D6FF" stop-opacity=".16"/><stop offset="1" stop-color="#38D6FF" stop-opacity="0"/></linearGradient>'+
    '<radialGradient id="e-vig" cx=".5" cy=".45" r=".72"><stop offset=".55" stop-color="#040b17" stop-opacity="0"/><stop offset="1" stop-color="#03080f" stop-opacity=".9"/></radialGradient>'+
    '<filter id="e-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>'+
    '</defs>';
  out+='<rect width="1048" height="748" fill="url(#e-bg)"/>';
  /* 顶棚 / 地面 / 两侧墙 */
  out+=svgPoly([[-96,80],[1144,80],[696,261],[352,261]],'fill="url(#e-ceil)" stroke="rgba(56,214,255,.14)"');
  out+=svgPoly([[-96,80],[352,261],[352,446],[-96,748]],'fill="url(#e-wallL)"');
  out+=svgPoly([[1144,80],[696,261],[696,446],[1144,748]],'fill="url(#e-wallR)"');
  [.24,.5,.76].forEach(function(f){
    out+=svgLine([-96,80+668*f],[352,261+185*f],'stroke="rgba(90,180,240,.06)" stroke-width="1"');
    out+=svgLine([1144,80+668*f],[696,261+185*f],'stroke="rgba(90,180,240,.06)" stroke-width="1"');
  });
  out+='<rect x="352" y="261" width="344" height="185" fill="url(#e-back)" stroke="rgba(56,214,255,.16)"/>';
  out+=svgPoly([[-96,748],[1144,748],[696,446],[352,446]],'fill="url(#e-floor)" stroke="rgba(56,214,255,.1)"');
  /* 地面分格 + 走道 */
  for(var t=.08;t<.95;t+=.08){
    out+=svgLine([FX(-620,t),FY(t)],[FX(620,t),FY(t)],'stroke="rgba(110,190,255,.07)" stroke-width="1"');
  }
  [-620,-310,0,310,620].forEach(function(u){
    out+=svgLine([FX(u,0),748],[FX(u,.95),FY(.95)],'stroke="rgba(110,190,255,.06)" stroke-width="1"');
  });
  out+=svgPoly([[474,748],[574,748],[534,446],[514,446]],'fill="rgba(56,214,255,.055)"');
  out+=svgLine([524,748],[524,446],'stroke="rgba(127,232,255,.28)" stroke-width="1.2" stroke-dasharray="10 12"');
  out+=svgLine([FX(-130,0),748],[FX(-130,1),446],'stroke="rgba(242,179,61,.22)" stroke-width="2.4"');
  out+=svgLine([FX(130,0),748],[FX(130,1),446],'stroke="rgba(242,179,61,.22)" stroke-width="2.4"');
  /* 湿地反光 */
  [-360,-120,120,360].forEach(function(u){
    var x1=FX(u,0),x2=FX(u,1);
    out+=svgPoly([[x1-30,748],[x1+30,748],[x2+5,446],[x2-5,446]],'fill="url(#e-reflect)" opacity=".55"');
  });
  /* 顶灯灯带 */
  [-360,-120,120,360].forEach(function(u){
    var x1=FX(u,0),x2=FX(u,1);
    out+=svgPoly([[x1-17,80],[x1+17,80],[x2+5,261],[x2-5,261]],'fill="rgba(150,235,255,.07)"');
    out+=svgLine([x1,82],[x2,262],'stroke="rgba(190,246,255,.6)" stroke-width="2.4" filter="url(#e-glow)"');
  });
  /* 加湿管路 */
  out+='<path d="M96 236 Q 320 202 524 196 T 952 236" fill="none" stroke="rgba(130,205,255,.5)" stroke-width="3"/>';
  out+='<path d="M110 258 Q 330 224 524 218 T 938 258" fill="none" stroke="rgba(130,205,255,.28)" stroke-width="2"/>';
  [250,400,650,800].forEach(function(nx,ni){
    var ny=214+ (ni===0||ni===3?18:8);
    out+='<line x1="'+nx+'" y1="'+ny+'" x2="'+nx+'" y2="'+(ny+18)+'" stroke="rgba(160,225,255,.55)" stroke-width="2"/>';
    out+='<circle cx="'+nx+'" cy="'+(ny+24)+'" r="7" fill="rgba(160,225,255,.07)" filter="url(#e-glow)"/>';
  });
  /* 后墙门洞与控制箱 */
  out+='<rect x="480" y="286" width="88" height="160" fill="rgba(56,214,255,.07)" filter="url(#e-glow)"/>';
  out+='<rect x="488" y="298" width="72" height="148" fill="url(#e-door)" stroke="rgba(160,235,255,.55)"/>';
  out+='<rect x="500" y="312" width="48" height="134" fill="rgba(5,18,32,.45)" stroke="rgba(120,210,255,.25)"/>';
  out+='<rect x="590" y="316" width="58" height="66" rx="4" fill="#0b2338" stroke="rgba(56,214,255,.3)"/>';
  for(var r=0;r<3;r++){out+='<circle cx="601" cy="'+(330+r*15)+'" r="2.2" fill="'+(r===0?'#2bd46e':'#38D6FF')+'" opacity=".85"/>';}
  out+='<text x="608" y="'+(330)+'" font-size="5.5" fill="#8AA0BE">CTRL</text>';
  out+='<text x="608" y="'+(345)+'" font-size="5.5" fill="#8AA0BE">HVAC</text>';
  out+='<text x="608" y="'+(360)+'" font-size="5.5" fill="#8AA0BE">AUTO</text>';
  /* 两侧菇架 */
  function rack(side){
    var segs=[[0.03,0.28],[0.3,0.55],[0.57,0.8]];
    segs.sort(function(a,b){return b[1]-a[1];});
    var h='';
    segs.forEach(function(seg){
      var t1=seg[0],t2=seg[1];
      var wx1=VPX+side*620*zf(t1),wx2=VPX+side*620*zf(t2);
      var ix1=wx1-side*150*zf(t1),ix2=wx2-side*150*zf(t2);
      var fy1=FY(t1),fy2=FY(t2),cy1=CY(t1),cy2=CY(t2);
      h+=svgPoly([[wx1,fy1],[ix1,fy1],[ix2,fy2],[wx2,fy2]],'fill="#0A1C2E" stroke="rgba(56,214,255,.12)" stroke-width=".8"');
      [0.34,0.57,0.8].forEach(function(f){
        var y1=fy1-(fy1-cy1)*f,y2=fy2-(fy2-cy2)*f;
        h+=svgPoly([[wx1,y1],[ix1,y1],[ix2,y2],[wx2,y2]],'fill="#1A3C58" stroke="rgba(110,195,245,.45)" stroke-width="1"');
        h+=svgLine([ix1,y1],[ix2,y2],'stroke="rgba(120,215,255,.6)" stroke-width="3.2"');
        h+=svgLine([ix1,y1+4],[ix2,y2+4],'stroke="rgba(6,20,34,.7)" stroke-width="2"');
        for(var k=1;k<=4;k++){
          var tt=t1+(t2-t1)*k/5,z=zf(tt);
          var wxx=VPX+side*620*z,ixx=wxx-side*150*z;
          var mx=(wxx+ixx)/2;
          var yy=FY(tt)-(FY(tt)-CY(tt))*f;
          var bw=52*z,bh=24*z;
          if(bw<9) continue;
          h+='<circle cx="'+mx.toFixed(1)+'" cy="'+(yy-bh-3*z).toFixed(1)+'" r="'+(20*z).toFixed(1)+'" fill="rgba(190,255,220,.05)"/>';
          h+='<rect x="'+(mx-bw/2).toFixed(1)+'" y="'+(yy-bh).toFixed(1)+'" width="'+bw.toFixed(1)+'" height="'+bh.toFixed(1)+'" rx="'+(3*z).toFixed(1)+'" fill="#67482B" stroke="#A97B49" stroke-width=".8"/>';
          for(var m=0;m<3;m++){
            var cxx=mx-bw*.3+m*bw*.3,cyy=yy-bh-2*z;
            h+='<circle cx="'+cxx.toFixed(1)+'" cy="'+cyy.toFixed(1)+'" r="'+(5*z).toFixed(1)+'" fill="#EFF7F1" opacity=".95"/>';
            h+='<circle cx="'+cxx.toFixed(1)+'" cy="'+(cyy-.4).toFixed(1)+'" r="'+(2.8*z).toFixed(1)+'" fill="#FFFFFF"/>';
          }
        }
      });
      h+=svgLine([wx1,fy1],[wx1,cy1],'stroke="rgba(100,185,235,.4)" stroke-width="2.2"');
      h+=svgLine([ix1,fy1],[ix1,cy1],'stroke="rgba(120,205,255,.55)" stroke-width="2.6"');
    });
    return h;
  }
  out+=rack(-1)+rack(1);
  /* 设备：空调机组（左前） */
  out+='<g><rect x="62" y="392" width="120" height="210" rx="6" fill="url(#e-steel)" stroke="rgba(130,200,240,.4)"/>'+
    '<rect x="74" y="404" width="96" height="72" rx="4" fill="#0a2034" stroke="rgba(56,214,255,.22)"/>';
  for(var lv=0;lv<5;lv++){out+='<line x1="80" y1="'+(416+lv*12)+'" x2="164" y2="'+(416+lv*12)+'" stroke="rgba(120,200,245,.25)"/>';}
  out+='<circle cx="122" cy="528" r="26" fill="#091b2d" stroke="rgba(120,210,255,.4)"/>'+
    '<path d="M122 528 L122 507 M122 528 L140 538 M122 528 L104 538" stroke="rgba(120,210,255,.5)" stroke-width="2"/>'+
    '<circle cx="122" cy="584" r="3" fill="#2bd46e"/><text x="132" y="588" font-size="7" fill="#8BE28E">RUN</text>'+
    '<rect x="72" y="596" width="100" height="6" rx="3" fill="rgba(56,214,255,.15)"/></g>';
  /* 设备：臭氧消毒柜（右前） */
  out+='<g><rect x="852" y="424" width="112" height="228" rx="6" fill="url(#e-steel)" stroke="rgba(130,200,240,.38)"/>'+
    '<rect x="864" y="438" width="88" height="128" rx="4" fill="rgba(56,214,255,.1)" stroke="rgba(56,214,255,.45)"/>'+
    '<rect x="872" y="446" width="72" height="112" rx="3" fill="rgba(9,26,46,.7)"/>'+
    '<circle cx="908" cy="486" r="18" fill="none" stroke="rgba(56,214,255,.45)" stroke-width="1.2"/>'+
    '<text x="908" y="490" text-anchor="middle" font-size="8" fill="#7FD8FF">O₃</text>'+
    '<rect x="872" y="580" width="72" height="26" rx="3" fill="#0a2034" stroke="rgba(56,214,255,.2)"/>'+
    '<circle cx="884" cy="593" r="3" fill="#2bd46e"/><text x="894" y="596" font-size="7.5" fill="#8BE28E">运行中</text>'+
    '<rect x="868" y="620" width="80" height="5" rx="2.5" fill="rgba(242,179,61,.35)"/></g>';
  /* 设备：灭菌蒸汽柜（左后） */
  out+='<g><rect x="326" y="302" width="82" height="144" rx="6" fill="url(#e-steel)" stroke="rgba(130,200,240,.35)"/>'+
    '<rect x="334" y="314" width="66" height="76" rx="4" fill="#0b2135" stroke="rgba(242,179,61,.35)"/>'+
    '<circle cx="354" cy="344" r="9" fill="none" stroke="rgba(242,179,61,.6)" stroke-width="1.4"/>'+
    '<circle cx="354" cy="344" r="2" fill="#F2B33D"/>'+
    '<circle cx="382" cy="344" r="9" fill="none" stroke="rgba(120,210,255,.5)" stroke-width="1.4"/>'+
    '<circle cx="382" cy="344" r="2" fill="#38D6FF"/>'+
    '<rect x="338" y="404" width="58" height="28" rx="3" fill="#0a2034" stroke="rgba(56,214,255,.22)"/>'+
    '<circle cx="348" cy="418" r="3" fill="#E5564B"/><text x="358" y="421" font-size="7" fill="#FFB3AD">灭菌中</text></g>';
  /* 设备：不锈钢操作台（右前） */
  out+='<g><polygon points="748,640 1010,606 1048,640 786,684" fill="url(#e-steel)" stroke="rgba(150,215,255,.4)"/>'+
    '<polygon points="786,684 1048,640 1048,676 786,720" fill="#10283c" stroke="rgba(110,170,255,.2)"/>'+
    '<ellipse cx="828" cy="654" rx="28" ry="11" fill="#0a1c2d" stroke="rgba(150,215,255,.4)"/>'+
    '<path d="M872 644 q0 -26 16 -26 q14 0 14 16" fill="none" stroke="rgba(160,225,255,.55)" stroke-width="3"/>'+
    '<rect x="944" y="632" width="40" height="16" rx="2" fill="#0b2135" stroke="rgba(56,214,255,.25)"/></g>';
  /* 环境浮标 */
  out+=envBubble(198,468,'货架区 A · 中层',d);
  out+=envBubble(438,374,'走道中段',d);
  out+=envBubble(752,468,'送风口 · 回风区',d);
  /* 设备标签 */
  out+=envLabel(140,352,'空调机组');
  out+=envLabel(520,158,'加湿管路系统');
  out+=envLabel(902,404,'臭氧消毒柜');
  out+=envLabel(352,282,'灭菌蒸汽柜');
  out+=envLabel(902,578,'不锈钢操作台');
  out+='<line x1="140" y1="363" x2="130" y2="392" stroke="rgba(120,200,255,.55)" stroke-dasharray="3 3"/>';
  out+='<line x1="520" y1="169" x2="520" y2="196" stroke="rgba(120,200,255,.55)" stroke-dasharray="3 3"/>';
  out+='<line x1="902" y1="415" x2="906" y2="436" stroke="rgba(120,200,255,.55)" stroke-dasharray="3 3"/>';
  out+='<line x1="352" y1="293" x2="360" y2="306" stroke="rgba(120,200,255,.55)" stroke-dasharray="3 3"/>';
  out+='<line x1="902" y1="567" x2="910" y2="620" stroke="rgba(120,200,255,.55)" stroke-dasharray="3 3"/>';
  /* 暗角 */
  out+='<rect width="1048" height="748" fill="url(#e-vig)" pointer-events="none"/>';
  return out;
}

function overheadSVG(d){
  var out='<defs><linearGradient id="p-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a1e33"/><stop offset="1" stop-color="#071727"/></linearGradient>'+
    '<radialGradient id="e-vig" cx=".5" cy=".45" r=".75"><stop offset=".6" stop-color="#040b17" stop-opacity="0"/><stop offset="1" stop-color="#03080f" stop-opacity=".85"/></radialGradient></defs>';
  out+='<rect width="1048" height="748" fill="#061223"/>';
  for(var gx=0;gx<1048;gx+=44){out+='<line x1="'+gx+'" y1="0" x2="'+gx+'" y2="748" stroke="rgba(56,214,255,.04)"/>';}
  for(var gy=0;gy<748;gy+=44){out+='<line x1="0" y1="'+gy+'" x2="1048" y2="'+gy+'" stroke="rgba(56,214,255,.04)"/>';}
  out+='<rect x="96" y="104" width="856" height="548" rx="10" fill="url(#p-floor)" stroke="rgba(56,214,255,.3)"/>';
  out+='<rect x="446" y="126" width="156" height="504" fill="rgba(56,214,255,.05)" stroke="rgba(56,214,255,.25)" stroke-dasharray="6 6"/>';
  out+='<text x="524" y="520" text-anchor="middle" font-size="10" fill="rgba(127,232,255,.65)">采 收 走 道</text>';
  out+='<path d="M524 620 L524 420" stroke="rgba(127,232,255,.3)" stroke-width="2" stroke-dasharray="8 8"/>';
  out+='<path d="M516 436 L524 420 L532 436" fill="none" stroke="rgba(127,232,255,.45)" stroke-width="2"/>';
  /* 货架组 */
  function planRack(x,y,w,h,label){
    var s='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="5" fill="#0d2439" stroke="rgba(90,170,220,.4)"/>';
    for(var r=0;r<3;r++){
      s+='<line x1="'+(x+8)+'" y1="'+(y+14+r*(h-20)/3)+'" x2="'+(x+w-8)+'" y2="'+(y+14+r*(h-20)/3)+'" stroke="rgba(56,214,255,.16)"/>';
      for(var c=0;c<7;c++){
        var cx=x+14+c*(w-28)/6, cy=y+24+r*(h-20)/3;
        s+='<circle cx="'+cx.toFixed(1)+'" cy="'+cy.toFixed(1)+'" r="4.4" fill="#E9F4EC" opacity=".82"/>';
        s+='<circle cx="'+cx.toFixed(1)+'" cy="'+(cy-1).toFixed(1)+'" r="1.5" fill="#8B5E3C" opacity=".6"/>';
      }
    }
    if(label) s+='<text x="'+(x+w/2)+'" y="'+(y+h-4)+'" text-anchor="middle" font-size="8" fill="rgba(157,184,220,.6)">'+label+'</text>';
    return s;
  }
  out+=planRack(142,160,268,104,'A 区 · 出菇架');
  out+=planRack(142,300,268,104,'B 区 · 出菇架');
  out+=planRack(142,440,268,104,'C 区 · 出菇架');
  out+=planRack(638,160,268,104,'D 区 · 出菇架');
  out+=planRack(638,300,268,104,'E 区 · 出菇架');
  out+=planRack(638,440,268,104,'F 区 · 出菇架');
  /* 设备 */
  out+='<rect x="300" y="600" width="94" height="32" rx="4" fill="#132a3e" stroke="rgba(56,214,255,.4)"/><text x="347" y="620" text-anchor="middle" font-size="8" fill="#BFE9FF">空调机组</text>';
  out+='<rect x="900" y="300" width="40" height="120" rx="4" fill="#132a3e" stroke="rgba(56,214,255,.4)"/><text x="920" y="365" text-anchor="middle" font-size="7.5" fill="#BFE9FF" transform="rotate(90 920 365)">臭氧柜</text>';
  out+='<rect x="120" y="612" width="94" height="32" rx="4" fill="#132a3e" stroke="rgba(242,179,61,.4)"/><text x="167" y="632" text-anchor="middle" font-size="8" fill="#FFD79B">灭菌蒸汽柜</text>';
  out+='<rect x="842" y="594" width="86" height="34" rx="4" fill="#132a3e" stroke="rgba(150,215,255,.4)"/><text x="885" y="615" text-anchor="middle" font-size="8" fill="#BFE9FF">不锈钢操作台</text>';
  out+='<line x1="210" y1="126" x2="900" y2="126" stroke="rgba(130,205,255,.45)" stroke-width="2" stroke-dasharray="2 6"/>';
  out+='<text x="600" y="118" text-anchor="middle" font-size="8" fill="rgba(157,184,220,.7)">加湿管路系统</text>';
  out+='<rect x="494" y="646" width="60" height="12" rx="2" fill="rgba(56,214,255,.28)" stroke="rgba(127,232,255,.6)"/><text x="524" y="642" text-anchor="middle" font-size="8" fill="#9FE7FF">出入口</text>';
  out+=envBubble(52,470,'货架区 C · 中层',d);
  out+=envBubble(432,340,'走道中段',d);
  out+=envBubble(798,470,'送风口 · 回风区',d);
  out+='<rect width="1048" height="748" fill="url(#e-vig)" pointer-events="none"/>';
  return out;
}

function renderEnv(){
  var d=envData(state.house||'1号出菇房');
  document.getElementById('envCanvas').innerHTML=(ENV_MODE==='aisle'?aisleSVG(d):overheadSVG(d));
}

function updateEnvPanels(){
  var d=envData(state.house||'1号出菇房');
  document.getElementById('envHouseName').textContent=d.name;
  document.getElementById('envStage').textContent=d.stage;
  document.getElementById('envCo2').textContent=d.co2;
  document.getElementById('envTemp').textContent=d.temp.toFixed(1);
  document.getElementById('envHum').textContent=d.hum.toFixed(1);
  document.getElementById('envCode').textContent=d.code;
  /* CO₂ 面板联动 */
  document.getElementById('co2Sub').textContent=d.name;
  document.getElementById('co2Range').textContent=d.range;
  renderGauge(d.co2,d.status);
  var st=document.getElementById('co2Status');
  st.className='st'+(d.status==='正常'?'':d.status==='预警'?' warn':' risk');
  st.innerHTML='<i></i>'+d.status;
  /* 设备面板联动 */
  document.getElementById('devSub').textContent=d.name+' · '+d.dev.total+' 台';
  document.getElementById('devTotal').textContent=d.dev.total;
  document.getElementById('devRun').textContent=d.dev.run;
  document.getElementById('devIdle').textContent=d.dev.idle;
  document.getElementById('devErr').textContent=d.dev.err;
  /* 环境监测面板联动 */
  document.getElementById('envPanelSub').textContent=d.name;
  document.getElementById('kTemp').textContent=d.temp.toFixed(1);
  document.getElementById('kHum').textContent=d.hum.toFixed(1);
  document.getElementById('kCo2').textContent=d.co2;
  refreshEnvPage(d);
  Array.prototype.forEach.call(document.querySelectorAll('.hchip'),function(b){
    b.classList.toggle('on',b.dataset.house===d.name);
  });
}

function setEnvHouse(name){
  state.house=envData(name).name;
  renderEnv();
  updateEnvPanels();
  syncURL();
}

Array.prototype.forEach.call(document.querySelectorAll('.hchip'),function(b){
  b.addEventListener('click',function(){setEnvHouse(b.dataset.house);});
});
Array.prototype.forEach.call(document.querySelectorAll('#viewToggle button'),function(b){
  b.addEventListener('click',function(){
    ENV_MODE=b.dataset.emode;
    Array.prototype.forEach.call(document.querySelectorAll('#viewToggle button'),function(x){
      x.classList.toggle('on',x===b);
    });
    renderEnv();
  });
});

/* ============================================================
   7. 视频监控 · 9 宫格 / 时间轴 / 告警 / 抓拍
   ============================================================ */
var VIDEO_CAMS=[
  {no:'①',name:'菇房区-主要通道',type:'aisle',badge:'',level:'ok',time:'10:22:35',img:'assets/cams/01.jpg'},
  {no:'②',name:'菇房区-菌架特写',type:'shelf',badge:'',level:'ok',time:'10:22:34',img:'assets/cams/02.jpg'},
  {no:'③',name:'设备区-机修角落',type:'equip',badge:'',level:'ok',time:'10:22:33',img:'assets/cams/03.jpg'},
  {no:'④',name:'菇房区-加湿区域',type:'humid',badge:'湿度偏高',level:'warn',time:'10:22:32',img:'assets/cams/04.jpg'},
  {no:'⑤',name:'温棚区-转运通道',type:'corridor',badge:'',level:'ok',time:'10:22:31',img:'assets/cams/05.jpg'},
  {no:'⑥',name:'出入口-大门口',type:'gate',badge:'',level:'ok',time:'10:22:30',img:'assets/cams/06.jpg'},
  {no:'⑦',name:'设备区-排风机房',type:'fan',badge:'风机故障',level:'risk',time:'10:22:29',img:'assets/cams/07.jpg'},
  {no:'⑧',name:'控制区-中控台',type:'control',badge:'',level:'ok',time:'10:22:28',img:'assets/cams/08.jpg'},
  {no:'⑨',name:'菇房区-包装操作区',type:'pack',badge:'人员作业',level:'warn',time:'10:22:27',img:'assets/cams/09.jpg'}
];
var SNAPS=[
  {t:'10:21:48',loc:'① 菇房区-主要通道',type:'aisle',img:'assets/cams/01.jpg',alert:true},
  {t:'10:21:31',loc:'④ 菇房区-加湿区域',type:'humid',img:'assets/cams/04.jpg',alert:true},
  {t:'10:20:06',loc:'⑦ 设备区-排风机房',type:'fan',img:'assets/cams/07.jpg',alert:true},
  {t:'10:18:42',loc:'⑥ 出入口-大门口',type:'gate',img:'assets/cams/06.jpg',alert:false},
  {t:'10:17:16',loc:'⑨ 菇房区-包装操作区',type:'pack',img:'assets/cams/09.jpg',alert:false},
  {t:'10:15:59',loc:'② 菇房区-菌架特写',type:'shelf',img:'assets/cams/02.jpg',alert:false}
];
var QUICK=[
  {t:'09:12:00',loc:'菇房区-主要通道',type:'aisle',dur:'12:00',img:'assets/cams/01.jpg'},
  {t:'09:43:00',loc:'菇房区-菌架特写',type:'shelf',dur:'08:30',img:'assets/cams/02.jpg'},
  {t:'09:51:12',loc:'出入口-大门口',type:'gate',dur:'06:12',img:'assets/cams/06.jpg'},
  {t:'09:15:05',loc:'控制区-中控台',type:'control',dur:'04:48',img:'assets/cams/08.jpg'}
];
var ALARMS=[
  {lv:1,text:'菇房温湿度异常',loc:'1# 菇房区',time:'10:21:18',open:true},
  {lv:2,text:'设备离线',loc:'3# 菇房区',time:'10:19:32',open:true},
  {lv:1,text:'空调机组故障',loc:'设备区',time:'10:18:07',open:true},
  {lv:2,text:'加湿器异常',loc:'4# 菇房区',time:'10:17:26',open:true},
  {lv:1,text:'CO₂ 浓度超标',loc:'2# 菇房区',time:'10:15:41',open:true},
  {lv:2,text:'门禁异常',loc:'出入口',time:'10:14:33',open:true},
  {lv:1,text:'NVR-01 离线',loc:'控制区',time:'10:12:15',open:true}
];
var DIST=[
  {name:'菇房区',val:72,pct:66.7,color:'#38D6FF'},
  {name:'走廊通道',val:14,pct:13.0,color:'#2E8FE8'},
  {name:'加工区',val:12,pct:11.1,color:'#F2B33D'},
  {name:'出入口',val:6,pct:5.6,color:'#E5564B'},
  {name:'制冷机房',val:4,pct:3.7,color:'#9A7BFF'}
];

/* ---- 摄像机画面：按参考图 9 个真实机位绘制（纯 SVG 模拟） ---- */
function camSVG(type,k){
  var S=function(a,b,t){return a+(b-a)*t;};
  var defs='<defs>';
  defs+='<linearGradient id="'+k+'-ceil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16282f"/><stop offset="1" stop-color="#33525e"/></linearGradient>';
  defs+='<linearGradient id="'+k+'-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22393f"/><stop offset=".5" stop-color="#142830"/><stop offset="1" stop-color="#050d13"/></linearGradient>';
  defs+='<linearGradient id="'+k+'-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#12242c"/><stop offset="1" stop-color="#0a171e"/></linearGradient>';
  defs+='<linearGradient id="'+k+'-led" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset="1" stop-color="#A6EBFF"/></linearGradient>';
  defs+='<linearGradient id="'+k+'-steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F2F8FA"/><stop offset=".38" stop-color="#C4D4DC"/><stop offset=".66" stop-color="#8096A4"/><stop offset="1" stop-color="#3E5464"/></linearGradient>';
  defs+='<linearGradient id="'+k+'-steel2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#4A6170"/><stop offset=".28" stop-color="#DCE9EF"/><stop offset=".62" stop-color="#9FB4C0"/><stop offset="1" stop-color="#41586a"/></linearGradient>';
  defs+='<linearGradient id="'+k+'-dark" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#17303a"/><stop offset="1" stop-color="#071219"/></linearGradient>';
  defs+='<linearGradient id="'+k+'-glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#EAFBFF" stop-opacity=".82"/><stop offset=".55" stop-color="#9ED9F0" stop-opacity=".34"/><stop offset="1" stop-color="#3E8FB6" stop-opacity=".22"/></linearGradient>';
  defs+='<radialGradient id="'+k+'-mush" cx=".38" cy=".3" r=".82"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".52" stop-color="#F0F4E8"/><stop offset="1" stop-color="#B7C4B1"/></radialGradient>';
  defs+='<radialGradient id="'+k+'-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#D3F7FF" stop-opacity=".6"/><stop offset=".42" stop-color="#66D9FF" stop-opacity=".2"/><stop offset="1" stop-color="#66D9FF" stop-opacity="0"/></radialGradient>';
  defs+='<radialGradient id="'+k+'-far" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#E4F7FF" stop-opacity=".62"/><stop offset="1" stop-color="#E4F7FF" stop-opacity="0"/></radialGradient>';
  defs+='<radialGradient id="'+k+'-vig" cx=".5" cy=".46" r=".76"><stop offset=".42" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#01070C" stop-opacity=".9"/></radialGradient>';
  defs+='<pattern id="'+k+'-scan" width="4" height="3" patternUnits="userSpaceOnUse"><rect width="4" height="1" fill="#CFEFFF" opacity=".055"/></pattern>';
  defs+='<filter id="'+k+'-blur"><feGaussianBlur stdDeviation="8"/></filter>';
  defs+='<filter id="'+k+'-soft"><feGaussianBlur stdDeviation="2.4"/></filter>';
  defs+='</defs>';

  var rect=function(x,y,w,h,f,o){
    return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" fill="'+f+'"'+(o!==undefined?' opacity="'+o+'"':'')+'/>';
  };
  var poly=function(pts,f,o){
    return '<polygon points="'+pts+'" fill="'+f+'"'+(o!==undefined?' opacity="'+o+'"':'')+'/>';
  };
  var ln=function(x1,y1,x2,y2,st,w,o){
    return '<line x1="'+x1.toFixed(1)+'" y1="'+y1.toFixed(1)+'" x2="'+x2.toFixed(1)+'" y2="'+y2.toFixed(1)+
      '" stroke="'+st+'" stroke-width="'+w+'"'+(o!==undefined?' opacity="'+o+'"':'')+'/>';
  };
  /* 菇簇：白色菌盖团 */
  var mush=function(x,y,r){
    return '<g>'+
      '<ellipse cx="'+x.toFixed(1)+'" cy="'+(y+r*.5).toFixed(1)+'" rx="'+(r*1.05).toFixed(1)+'" ry="'+(r*.34).toFixed(1)+'" fill="#04121a" opacity=".45"/>'+
      '<circle cx="'+(x-r*.34).toFixed(1)+'" cy="'+(y+r*.1).toFixed(1)+'" r="'+(r*.6).toFixed(1)+'" fill="url(#'+k+'-mush)"/>'+
      '<circle cx="'+(x+r*.32).toFixed(1)+'" cy="'+(y+r*.14).toFixed(1)+'" r="'+(r*.52).toFixed(1)+'" fill="url(#'+k+'-mush)"/>'+
      '<circle cx="'+(x+r*.05).toFixed(1)+'" cy="'+(y-r*.3).toFixed(1)+'" r="'+(r*.58).toFixed(1)+'" fill="url(#'+k+'-mush)"/>'+
      '<circle cx="'+(x-r*.05).toFixed(1)+'" cy="'+(y-r*.02).toFixed(1)+'" r="'+(r*.38).toFixed(1)+'" fill="#FDFEF6" opacity=".9"/>'+
      '</g>';
  };
  var crate=function(x,y,w,h){
    return '<g>'+
      '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="1.4" fill="#1E5E92" stroke="rgba(158,220,255,.5)" stroke-width=".7"/>'+
      '<rect x="'+(x+1.6).toFixed(1)+'" y="'+(y+1.6).toFixed(1)+'" width="'+(w-3.2).toFixed(1)+'" height="'+(h*.26).toFixed(1)+'" fill="#3C82B4" opacity=".75"/>'+
      '<path d="M'+x.toFixed(1)+' '+(y+h*.52).toFixed(1)+'h'+w.toFixed(1)+'M'+x.toFixed(1)+' '+(y+h*.8).toFixed(1)+'h'+w.toFixed(1)+'" stroke="#0A2740" stroke-width="1" opacity=".65"/>'+
      '</g>';
  };
  var worker=function(x,y,sc,coat){
    return '<g transform="translate('+x+','+y+') scale('+sc+')">'+
      '<ellipse cx="0" cy="60" rx="30" ry="6" fill="#03121b" opacity=".5"/>'+
      '<path d="M-21 58 L-16 18 Q0 7 16 18 L21 58 Z" fill="'+(coat||'#E9F2F7')+'"/>'+
      '<path d="M-16 18 Q0 7 16 18 L14 27 Q0 19 -14 27 Z" fill="#C9DCE7"/>'+
      '<path d="M-16 24 L-25 46 L-17 49 L-9 30 Z" fill="'+(coat||'#E9F2F7')+'"/>'+
      '<path d="M16 24 L25 44 L17 48 L9 30 Z" fill="'+(coat||'#E9F2F7')+'"/>'+
      '<circle cx="0" cy="0" r="11" fill="#E4C6A8"/>'+
      '<path d="M-12 -1 Q-12 -15 0 -15 Q12 -15 12 -1 Q6 -9 0 -7 Q-6 -9 -12 -1 Z" fill="#2C6DAE"/>'+
      '<path d="M-6 24 L-2 40 L2 40 L6 24 Z" fill="#DCE9F0"/>'+
      '</g>';
  };

  var scene='';

  if(type==='aisle'||type==='humid'){
    var misty=(type==='humid');
    scene+=rect(0,0,400,220,'#050e14');
    /* 顶棚 */
    scene+=poly('0,0 400,0 256,92 144,92','url(#'+k+'-ceil)');
    /* 顶灯（向灭点收缩） */
    [[.10,.19],[.27,.35],[.47,.54],[.70,.77]].forEach(function(p){
      var y1=92*p[0],y2=92*p[1];
      var l1=144*p[0],r1=400-144*p[0],l2=144*p[1],r2=400-144*p[1];
      scene+=poly(l1.toFixed(1)+','+y1.toFixed(1)+' '+r1.toFixed(1)+','+y1.toFixed(1)+' '+
        r2.toFixed(1)+','+y2.toFixed(1)+' '+l2.toFixed(1)+','+y2.toFixed(1),'url(#'+k+'-led)','.92');
      scene+='<ellipse cx="200" cy="'+(y2+5).toFixed(1)+'" rx="'+(150-96*p[1]).toFixed(1)+'" ry="'+(12-7*p[1]).toFixed(1)+'" fill="url(#'+k+'-glow)"/>';
    });
    /* 侧墙 */
    scene+=poly('0,0 144,92 144,126 0,220','url(#'+k+'-wall)');
    scene+=poly('400,0 256,92 256,126 400,220','url(#'+k+'-wall)');
    for(var wi=1;wi<=4;wi++){
      var wf=wi/5, wx1=144*wf, wx2=400-144*wf, wyT=92*wf, wyB=220-(220-126)*wf;
      scene+=ln(wx1,wyT,wx1,wyB,'rgba(150,215,235,.13)',1);
      scene+=ln(wx2,wyT,wx2,wyB,'rgba(150,215,235,.13)',1);
    }
    /* 地面 */
    scene+=poly('0,220 400,220 256,126 144,126','url(#'+k+'-floor)');
    [-30,55,135,265,345,430].forEach(function(x){
      var xf=x+(200-x)*.87;
      scene+=ln(x,220,xf,126,'rgba(165,228,242,.12)',1);
    });
    [.16,.34,.55,.78].forEach(function(f){
      scene+=ln(144*f,220-94*f,400-144*f,220-94*f,'rgba(165,228,242,.1)',1);
    });
    /* 地面反光 */
    scene+=poly('154,126 246,126 322,220 78,220','url(#'+k+'-glow)','.5');
    scene+=poly('150,126 250,126 210,220 190,220','url(#'+k+'-glow)','.45');
    /* 两侧立体菇架 */
    var F=[0,.22,.40,.55,.68,.80,.90,1];
    var geo=F.map(function(f){
      return {xo:S(-46,150,f),xi:S(112,193,f),yt:S(24,92,f),yb:S(224,124,f),f:f};
    });
    var shelfSide=function(mirror){
      var o='';
      var mx=function(x){return mirror?400-x:x;};
      for(var i=geo.length-2;i>=0;i--){
        var a=geo[i],b=geo[i+1];
        [0,.32,.64,.96].forEach(function(lv){
          var topA=a.yt+(a.yb-a.yt)*lv,topB=b.yt+(b.yb-b.yt)*lv;
          var bA=a.yt+(a.yb-a.yt)*Math.min(lv+.3,1),bB=b.yt+(b.yb-b.yt)*Math.min(lv+.3,1);
          /* 层板顶面 */
          o+=poly(mx(a.xo).toFixed(1)+','+topA.toFixed(1)+' '+mx(a.xi).toFixed(1)+','+topA.toFixed(1)+' '+
            mx(b.xi).toFixed(1)+','+topB.toFixed(1)+' '+mx(b.xo).toFixed(1)+','+topB.toFixed(1),'#35505C');
          /* 前立面 */
          o+=poly(mx(a.xi).toFixed(1)+','+topA.toFixed(1)+' '+mx(b.xi).toFixed(1)+','+topB.toFixed(1)+' '+
            mx(b.xi).toFixed(1)+','+bB.toFixed(1)+' '+mx(a.xi).toFixed(1)+','+bA.toFixed(1),'#16292F');
          /* 层板灯带 */
          o+=ln(mx(a.xi),topA,mx(b.xi),topB,'#CBF4FF',Math.max(2.6*(1-a.f),.3),'.88');
          /* 菌包＋菇体 */
          var cn=Math.max(2,Math.round(7*(1-a.f)));
          for(var j=0;j<cn;j++){
            var u=(j+.5)/cn;
            var mx1=mx(a.xo),mx2=mx(a.xi);
            var px=mx1+(mx2-mx1)*u;
            o+=mush(px,topA,Math.max(6.8*(1-a.f),1));
          }
        });
        o+=ln(mx(a.xi),a.yt,mx(a.xi),a.yb,'#66828D',Math.max(2.6*(1-a.f),.35),'.92');
      }
      return o;
    };
    scene+=shelfSide(false)+shelfSide(true);
    /* 走道尽头雾光 */
    scene+='<ellipse cx="200" cy="112" rx="86" ry="30" fill="url(#'+k+'-far)"/>';
    if(misty){
      scene+='<g filter="url(#'+k+'-blur)">'+
        '<ellipse cx="200" cy="150" rx="150" ry="46" fill="#D8F1FB" opacity=".3"/>'+
        '<ellipse cx="112" cy="126" rx="96" ry="36" fill="#D8F1FB" opacity=".26"/>'+
        '<ellipse cx="292" cy="136" rx="100" ry="40" fill="#D8F1FB" opacity=".24"/>'+
        '<ellipse cx="200" cy="96" rx="78" ry="22" fill="#EAF9FF" opacity=".3"/>'+
        '</g>';
      for(var di=0;di<26;di++){
        var dx=(di*67)%390+5, dy=(di*41)%170+22;
        scene+='<circle cx="'+dx+'" cy="'+dy+'" r="'+(di%3===0?1.3:.8)+'" fill="#EAFBFF" opacity=".45"/>';
      }
    }
  }

  if(type==='shelf'){
    scene+=rect(0,0,400,220,'#061117');
    scene+=poly('0,0 400,0 400,74 0,58','#0D1E26');
    scene+=ln(0,28,400,12,'rgba(150,210,230,.22)',3);
    scene+=ln(0,34,400,18,'rgba(150,210,230,.12)',1.5);
    [0,1,2,3].forEach(function(r){
      var y=84+r*38;
      scene+=poly('0,'+(y+7)+' 400,'+(y-7)+' 400,'+(y+2)+' 0,'+(y+16),'#2A404B');
      scene+=poly('0,'+(y+7)+' 400,'+(y-7)+' 400,'+(y-10)+' 0,'+(y+4),'#8299A4');
      scene+=ln(0,y+16,400,y+2,'#CFF6FF',1.8,'.78');
      for(var i=0;i<11;i++){
        var u=(i+.5)/11,x=u*400,cy=y-1-u*12,rr=9.6-u*1.7;
        scene+='<rect x="'+(x-rr*.6).toFixed(1)+'" y="'+(cy+rr*.42).toFixed(1)+'" width="'+(rr*1.2).toFixed(1)+
          '" height="'+(rr*.5).toFixed(1)+'" rx="'+(rr*.16).toFixed(1)+'" fill="#C6AC86" opacity=".55"/>';
        scene+=mush(x,cy,rr);
      }
    });
    [0,118,248,382].forEach(function(x){scene+=ln(x,0,x+20,220,'rgba(126,176,196,.3)',3);});
    scene+=poly('0,0 400,0 400,30 0,48','rgba(3,10,16,.6)');
    scene+=poly('0,190 400,178 400,220 0,220','rgba(3,10,16,.55)');
  }

  if(type==='equip'){
    scene+=rect(0,0,400,220,'#071219');
    scene+=poly('0,0 400,0 400,132 0,148','#0C1D27');
    scene+=poly('0,148 400,132 400,220 0,220','url(#'+k+'-floor)');
    for(var ex=32;ex<400;ex+=62){scene+=ln(ex,0,ex,140,'rgba(140,200,220,.11)',1);}
    scene+=rect(24,2,352,7,'#DFF8FF','.55');
    scene+='<ellipse cx="200" cy="16" rx="190" ry="26" fill="url(#'+k+'-glow)" opacity=".6"/>';
    scene+=poly('38,148 168,140 132,220 2,220','rgba(120,215,255,.06)');
    scene+=poly('232,138 362,148 398,220 268,220','rgba(120,215,255,.06)');
    /* 卧式罐体 */
    var tank=function(cx,cy,w,h){
      var x=cx-w/2,y=cy-h/2;
      return '<g>'+
        '<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+w.toFixed(1)+'" height="'+h.toFixed(1)+'" rx="'+(h/2).toFixed(1)+'" fill="url(#'+k+'-steel)" stroke="rgba(210,235,245,.55)" stroke-width=".8"/>'+
        '<ellipse cx="'+(x+w*.3).toFixed(1)+'" cy="'+(y+h*.32).toFixed(1)+'" rx="'+(w*.2).toFixed(1)+'" ry="'+(h*.17).toFixed(1)+'" fill="#FFFFFF" opacity=".28"/>'+
        '<rect x="'+(x+w*.52).toFixed(1)+'" y="'+(y+h*.4).toFixed(1)+'" width="'+(w*.26).toFixed(1)+'" height="'+(h*.2).toFixed(1)+'" rx="2" fill="#12303C"/>'+
        '<circle cx="'+(x+w*.6).toFixed(1)+'" cy="'+(y+h*.5).toFixed(1)+'" r="2.6" fill="#7CF7B0"/>'+
        '<circle cx="'+(x+w*.67).toFixed(1)+'" cy="'+(y+h*.5).toFixed(1)+'" r="2.6" fill="#6FE0FF" opacity=".8"/>'+
        '<rect x="'+(x+w*.1).toFixed(1)+'" y="'+(y+h*.62).toFixed(1)+'" width="'+(w*.34).toFixed(1)+'" height="'+(h*.1).toFixed(1)+'" fill="#5E7887" opacity=".5"/>'+
        '<rect x="'+(x+w*.22).toFixed(1)+'" y="'+(y+h).toFixed(1)+'" width="6" height="16" fill="#334B5A"/>'+
        '<rect x="'+(x+w*.72).toFixed(1)+'" y="'+(y+h).toFixed(1)+'" width="6" height="16" fill="#334B5A"/>'+
        '</g>';
    };
    scene+=tank(108,86,178,74);
    scene+=tank(296,100,196,82);
    /* 管路 */
    scene+=ln(0,54,400,40,'#7E96A6',4,'.9');
    scene+=ln(0,44,400,30,'#4E6777',2,'.8');
    scene+=ln(196,54,196,44,'#9FB4C0',5,'.9');
    scene+=ln(196,58,196,96,'#9FB4C0',4,'.85');
    /* 控制柜 */
    scene+='<rect x="24" y="16" width="54" height="58" rx="2" fill="#12303F" stroke="rgba(140,210,235,.4)"/>';
    scene+='<rect x="31" y="23" width="40" height="20" fill="#0B2532" stroke="rgba(56,214,255,.4)"/>';
    scene+='<polyline points="34,39 44,31 54,35 64,27" fill="none" stroke="#6FE0FF" stroke-width="1.2"/>';
    scene+='<circle cx="38" cy="54" r="3" fill="#7CF7B0"/><circle cx="50" cy="54" r="3" fill="#FFD37A"/><circle cx="62" cy="54" r="3" fill="#6FE0FF"/>';
    /* 地面格栅 */
    for(var gy=152;gy<216;gy+=9){scene+=ln(0,gy,400,gy-16,'rgba(140,200,220,.1)',1);}
  }

  if(type==='corridor'){
    scene+=rect(0,0,400,220,'#050e14');
    scene+=poly('0,0 400,0 252,96 148,96','url(#'+k+'-ceil)');
    scene+=poly('0,0 148,96 148,130 0,220','url(#'+k+'-wall)');
    scene+=poly('400,0 252,96 252,130 400,220','url(#'+k+'-wall)');
    [[.14,.24],[.36,.44],[.62,.68]].forEach(function(p){
      var y1=96*p[0],y2=96*p[1];
      var l1=148*p[0],r1=400-148*p[0],l2=148*p[1],r2=400-148*p[1];
      scene+=poly(l1.toFixed(1)+','+y1.toFixed(1)+' '+r1.toFixed(1)+','+y1.toFixed(1)+' '+
        r2.toFixed(1)+','+y2.toFixed(1)+' '+l2.toFixed(1)+','+y2.toFixed(1),'url(#'+k+'-led)','.9');
    });
    scene+=poly('0,220 400,220 252,130 148,130','url(#'+k+'-floor)');
    /* 尽头门洞 */
    scene+='<rect x="170" y="66" width="60" height="64" fill="#1B3A4A" stroke="rgba(160,225,245,.45)"/>';
    scene+='<rect x="176" y="72" width="48" height="58" fill="url(#'+k+'-glass)"/>';
    scene+=ln(200,72,200,130,'rgba(230,250,255,.7)',1.6);
    scene+='<ellipse cx="200" cy="110" rx="72" ry="34" fill="url(#'+k+'-far)"/>';
    scene+=poly('176,130 224,130 258,220 142,220','rgba(56,214,255,.1)');
    /* 两侧蓝框堆垛（近大远小） */
    var stack=function(nx,ny,sc,mirror){
      var o='';
      for(var i=0;i<3;i++){
        for(var j=0;j<2;j++){
          var bx=nx+j*(34*sc), by=ny-i*(20*sc);
          o+=crate(mirror?400-bx-34*sc:bx,by,34*sc,20*sc);
        }
      }
      return o;
    };
    scene+=stack(4,196,1,false);
    scene+=stack(4,160,.72,false);
    scene+=stack(258,186,.9,true);
    scene+=stack(276,152,.62,true);
    /* 顶部/地面暗角 */
    scene+=poly('0,0 400,0 400,26 0,40','rgba(3,10,16,.5)');
  }

  if(type==='gate'){
    scene+=rect(0,0,400,220,'#07121a');
    /* 室内墙与顶 */
    scene+=poly('0,0 400,0 400,26 0,34','#16303C');
    scene+=rect(0,34,400,124,'#0D2029');
    /* 玻璃门洞（室外逆光） */
    scene+=rect(92,30,216,140,'#EFFBFF','.9');
    scene+=rect(92,30,216,140,'url(#'+k+'-glass)');
    scene+='<g opacity=".85">'+poly('96,168 136,30 176,30 150,168','#FFFFFF','.55')+poly('236,30 268,30 306,168 262,168','#FFFFFF','.4')+'</g>';
    /* 门框 */
    scene+='<rect x="90" y="28" width="220" height="4" fill="#B9CDD8"/>';
    scene+='<rect x="88" y="28" width="4" height="142" fill="#8FA6B4"/><rect x="308" y="28" width="4" height="142" fill="#8FA6B4"/>';
    scene+=ln(200,32,200,168,'#7E95A4',3);
    scene+='<rect x="188" y="92" width="6" height="26" rx="2" fill="#DDE9F0"/>';
    scene+='<rect x="206" y="92" width="6" height="26" rx="2" fill="#DDE9F0"/>';
    /* 门头标识 */
    scene+='<rect x="120" y="12" width="160" height="16" rx="2" fill="rgba(8,28,44,.85)" stroke="rgba(120,205,245,.5)"/>';
    scene+='<text x="200" y="23.5" text-anchor="middle" font-size="9" letter-spacing="2" fill="#DFF7FF" font-family="Microsoft YaHei">食用菌工厂 · 出入口</text>';
    /* 室外远景 */
    scene+='<g opacity=".55">'+rect(104,88,44,80,'#BFE6EF')+rect(252,96,44,72,'#BFE6EF')+ln(104,88,148,88,'#8FBAC8',1.5)+'</g>';
    /* 地面 */
    scene+=poly('0,170 400,170 400,220 0,220','url(#'+k+'-floor)');
    for(var tx=0;tx<=400;tx+=50){scene+=ln(tx,170,tx,220,'rgba(165,228,242,.13)',1);}
    scene+=ln(0,192,400,192,'rgba(165,228,242,.12)',1);
    scene+=poly('92,170 308,170 342,220 58,220','url(#'+k+'-glow)','.55');
    /* 门禁与闸机 */
    scene+='<rect x="18" y="96" width="34" height="60" rx="3" fill="#132B38" stroke="rgba(120,200,235,.35)"/>';
    scene+='<rect x="24" y="104" width="22" height="16" fill="#0B2230" stroke="rgba(56,214,255,.45)"/>';
    scene+='<circle cx="35" cy="112" r="3" fill="#7CF7B0"/>';
    scene+='<rect x="348" y="86" width="40" height="74" rx="3" fill="#122A37" stroke="rgba(120,200,235,.3)"/>';
    scene+='<rect x="354" y="94" width="28" height="20" fill="#0B2230" stroke="rgba(56,214,255,.35)"/>';
    /* 顶部射灯 */
    scene+='<ellipse cx="200" cy="40" rx="120" ry="12" fill="url(#'+k+'-glow)" opacity=".8"/>';
  }

  if(type==='fan'){
    scene+=rect(0,0,400,220,'#06111a');
    scene+=poly('0,0 400,0 400,8 0,14','#1A323D');
    scene+=rect(0,14,400,138,'#0B1C26');
    for(var fx=20;fx<400;fx+=58){scene+=ln(fx,14,fx,152,'rgba(140,200,220,.1)',1);}
    /* 管道 */
    scene+=ln(0,26,400,18,'#8AA2B0',7,'.9');
    scene+=ln(0,26,400,18,'#D9E6EC',2,'.5');
    scene+=ln(0,126,400,118,'#5C7685',5,'.85');
    /* 地面 */
    scene+=poly('0,152 400,152 400,220 0,220','url(#'+k+'-floor)');
    for(var fg=158;fg<220;fg+=8){scene+=ln(0,fg,400,fg,'rgba(145,205,225,.1)',1);}
    /* 两台大型风机柜 */
    var fanUnit=function(x,y,w,h){
      var cx=x+w/2,cy=y+h/2,r=w*.34;
      var o='<g>'+
        '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="3" fill="url(#'+k+'-steel2)" stroke="rgba(215,235,245,.5)"/>'+
        '<rect x="'+(x+6)+'" y="'+(y+6)+'" width="'+(w-12)+'" height="'+(h-12)+'" rx="4" fill="#12303C" opacity=".55"/>'+
        '<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="#081820" stroke="rgba(190,230,245,.55)" stroke-width="2"/>'+
        '<circle cx="'+cx+'" cy="'+cy+'" r="'+(r*.78)+'" fill="none" stroke="rgba(120,185,210,.4)"/>'+
        '<circle cx="'+cx+'" cy="'+cy+'" r="'+(r*.55)+'" fill="none" stroke="rgba(120,185,210,.32)"/>'+
        '<circle cx="'+cx+'" cy="'+cy+'" r="'+(r*.32)+'" fill="none" stroke="rgba(120,185,210,.28)"/>';
      for(var bi=0;bi<5;bi++){
        var ang=bi*72*Math.PI/180;
        o+=ln(cx,cy,cx+Math.cos(ang)*r*.9,cy+Math.sin(ang)*r*.9,'rgba(200,235,248,.35)',2.4);
      }
      o+='<circle cx="'+cx+'" cy="'+cy+'" r="'+(r*.14)+'" fill="#9FB4C0"/></g>';
      return o;
    };
    scene+=fanUnit(22,44,166,104);
    scene+=fanUnit(210,34,172,116);
    /* 管道阴影与地面反光 */
    scene+=poly('22,148 188,148 210,220 0,220','rgba(56,214,255,.05)');
    scene+=poly('210,150 382,150 400,220 210,220','rgba(56,214,255,.05)');
    scene+=poly('0,0 400,0 400,18 0,26','rgba(3,10,16,.55)');
  }

  if(type==='control'){
    scene+=rect(0,0,400,220,'#050d16');
    /* 后墙与灯带 */
    scene+=rect(0,0,400,150,'#081826');
    scene+=ln(0,8,400,4,'rgba(80,180,230,.5)',2);
    /* 大屏 */
    scene+='<rect x="26" y="16" width="348" height="104" rx="3" fill="#061522" stroke="rgba(56,214,255,.4)"/>';
    for(var cr=0;cr<2;cr++){
      for(var cc=0;cc<3;cc++){
        var bx=34+cc*114, by=22+cr*50;
        scene+='<rect x="'+bx+'" y="'+by+'" width="104" height="42" fill="#0C2B3E" stroke="rgba(90,190,235,.35)"/>';
        scene+='<polyline points="'+(bx+6)+','+(by+32)+' '+(bx+24)+','+(by+20)+' '+(bx+42)+','+(by+27)+' '+(bx+64)+','+(by+13)+' '+(bx+96)+','+(by+22)+'" fill="none" stroke="#67E3FF" stroke-width="1.3" opacity=".8"/>';
        scene+='<polyline points="'+(bx+6)+','+(by+37)+' '+(bx+30)+','+(by+31)+' '+(bx+52)+','+(by+35)+' '+(bx+76)+','+(by+24)+' '+(bx+96)+','+(by+30)+'" fill="none" stroke="#4FA9FF" stroke-width="1.1" opacity=".55"/>';
        scene+='<rect x="'+(bx+6)+'" y="'+(by+5)+'" width="26" height="3" rx="1.5" fill="rgba(120,225,255,.5)"/>';
      }
    }
    /* 大屏反光 */
    scene+='<rect x="26" y="16" width="348" height="104" fill="url(#'+k+'-glass)" opacity=".12"/>';
    /* 背景光晕 */
    scene+='<ellipse cx="200" cy="70" rx="210" ry="86" fill="url(#'+k+'-glow)" opacity=".8"/>';
    /* 操作台 */
    scene+=poly('24,152 376,152 348,200 52,200','#16323F');
    scene+=poly('24,152 376,152 372,158 28,158','#3E6474');
    [92,200,308].forEach(function(mx){
      scene+='<rect x="'+(mx-32)+'" y="126" width="64" height="34" rx="2" fill="#0A1E2B" stroke="rgba(56,214,255,.45)"/>';
      scene+='<rect x="'+(mx-28)+'" y="130" width="56" height="26" fill="rgba(56,214,255,.14)"/>';
      scene+='<polyline points="'+(mx-26)+',150 '+(mx-12)+',140 '+(mx+2)+',145 '+(mx+20)+',134" fill="none" stroke="#8FEBFF" stroke-width="1.2" opacity=".8"/>';
      scene+='<rect x="'+(mx-4)+'" y="160" width="8" height="8" fill="#0C2230"/>';
    });
    /* 座椅背影 */
    var chair=function(x){
      return '<g>'+
        '<rect x="'+(x-17)+'" y="160" width="34" height="34" rx="8" fill="#0D1F2B" stroke="rgba(120,190,220,.25)"/>'+
        '<rect x="'+(x-19)+'" y="192" width="38" height="10" rx="4" fill="#0A1824"/>'+
        '<rect x="'+(x-2)+'" y="202" width="4" height="12" fill="#22394A"/>'+
        '<rect x="'+(x-14)+'" y="212" width="28" height="3" rx="1.5" fill="#22394A"/>'+
        '</g>';
    };
    scene+=chair(150)+chair(250);
    /* 地面 */
    scene+=poly('0,200 400,200 400,220 0,220','#07131C');
    scene+='<ellipse cx="200" cy="212" rx="180" ry="18" fill="url(#'+k+'-glow)" opacity=".35"/>';
    scene+=poly('0,0 400,0 400,10 0,14','rgba(2,8,14,.6)');
  }

  if(type==='pack'){
    scene+=rect(0,0,400,220,'#07131b');
    /* 背景墙 + 货架 */
    scene+=rect(0,0,400,124,'#0C202A');
    scene+=ln(0,30,400,22,'rgba(150,210,230,.2)',3);
    /* 背景模糊货架与菇筐 */
    scene+='<g opacity=".55" filter="url(#'+k+'-soft)">';
    for(var sr=0;sr<2;sr++){
      var sy=46+sr*30;
      scene+=ln(0,sy,400,sy-8,'#4F6C79',3);
      for(var si=0;si<9;si++){
        var sx=12+si*44;
        scene+=crate(sx,sy-16-((si%2)*2),30,14);
        scene+=mush(sx+15,sy-19,7);
      }
    }
    scene+='</g>';
    /* 不锈钢操作台 */
    scene+=poly('0,150 400,138 400,166 0,180','#A9BDC7');
    scene+=poly('0,150 400,138 400,142 0,154','#E6F0F4');
    scene+=poly('0,180 400,166 400,220 0,220','#20333D');
    scene+=ln(0,180,400,166,'rgba(220,240,250,.35)',1.5);
    /* 台面菇筐与菇体 */
    [26,118,214,306].forEach(function(bx,i){
      var by=150-i*1.1;
      scene+=crate(bx,by-16,68,17);
      for(var mi=0;mi<4;mi++){scene+=mush(bx+9+mi*16,by-18,7.4);}
    });
    /* 作业人员 */
    scene+=worker(120,108,1.05);
    scene+=worker(274,112,.96);
    /* 顶灯 */
    scene+=rect(90,0,120,6,'#F2FCFF','.85');
    scene+=rect(230,0,90,5,'#F2FCFF','.6');
    scene+='<ellipse cx="180" cy="24" rx="150" ry="30" fill="url(#'+k+'-glow)" opacity=".7"/>';
    /* 前景台沿 */
    scene+=poly('0,196 400,184 400,200 0,214','#0A1A24','.9');
  }

  /* 通用迭加：暗角、扫描线、冷调色 */
  var post='<rect width="400" height="220" fill="url(#'+k+'-vig)"/>'+
    '<rect width="400" height="220" fill="url(#'+k+'-scan)"/>'+
    '<rect width="400" height="220" fill="#0A3A52" opacity=".07"/>';

  return '<svg viewBox="0 0 400 220" preserveAspectRatio="xMidYMid slice">'+defs+scene+post+'</svg>';
}

function donutMulti(segs,size,sw){
  var r=(size-sw)/2,c=2*Math.PI*r,off=0;
  var s='<svg viewBox="0 0 '+size+' '+size+'">';
  s+='<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="rgba(110,170,255,.12)" stroke-width="'+sw+'"/>';
  segs.forEach(function(sg){
    var len=c*sg.pct/100;
    s+='<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="'+sg.color+
      '" stroke-width="'+sw+'" stroke-dasharray="'+Math.max(len-2,1).toFixed(1)+' '+c.toFixed(1)+
      '" stroke-dashoffset="'+(-off).toFixed(1)+'" transform="rotate(-90 '+size/2+' '+size/2+')" stroke-linecap="round"'+
      ' data-tip="'+(sg.name?sg.name+' · ':'')+sg.pct+'%"/>';
    off+=len;
  });
  return s+'</svg>';
}

var alarmFilter='all';
function renderAlarms(){
  var list=ALARMS.filter(function(a){
    return alarmFilter==='all'||(alarmFilter==='open'&&a.open)||(alarmFilter==='done'&&!a.open);
  });
  document.getElementById('alarmList').innerHTML=list.map(function(a){
    return '<div class="alarm-row"><span class="lv lv-'+a.lv+'">'+(a.lv===1?'严重':a.lv===2?'警告':'提示')+'</span>'+
      '<div class="alarm-main"><b>'+a.text+'</b><span>'+a.loc+' · 2026-11-16 '+a.time+'</span></div>'+
      '<span class="ast'+(a.open?'':' done')+'">'+(a.open?'未处理':'已处理')+'</span></div>';
  }).join('');
}

function openVF(i){
  var c=VIDEO_CAMS[i];
  if(!c) return;
  document.getElementById('vfTitle').textContent=c.no+' '+c.name;
  document.getElementById('vfTime').textContent='2026-11-16 '+c.time;
  document.getElementById('vfScene').innerHTML=camSVG(c.type,'f')+
    '<img src="'+c.img+'" alt="" onerror="this.remove()">';
  document.getElementById('vFocus').hidden=false;
}
function closeVF(){
  var el=document.getElementById('vFocus');
  if(el) el.hidden=true;
}

/* 时间轴 */
var tlPct=43,tlTimer=null,tlDrag=false;
function pad2(n){return ('0'+n).slice(-2);}
function tlLabel(p){
  var sec=Math.round(p/100*86400);
  return pad2(Math.floor(sec/3600))+':'+pad2(Math.floor(sec%3600/60))+':'+pad2(sec%60);
}
function setTL(p){
  tlPct=clamp(p,0,100);
  var ph=document.getElementById('tlPlayhead');
  if(ph) ph.style.left=tlPct+'%';
  var tm=document.getElementById('tlTime');
  if(tm) tm.textContent=tlLabel(tlPct);
}
function stopTL(){
  if(tlTimer){clearInterval(tlTimer);tlTimer=null;}
  var t=document.getElementById('tlPlayTxt');
  if(t) t.textContent='播放';
}
function toggleTL(){
  if(tlTimer){stopTL();return;}
  document.getElementById('tlPlayTxt').textContent='暂停';
  tlTimer=setInterval(function(){
    setTL(tlPct+0.08);
    if(tlPct>=100) stopTL();
  },120);
}

var videoBuilt=false;
function buildVideoOnce(){
  if(videoBuilt) return;
  videoBuilt=true;
  document.getElementById('ringOnline').innerHTML=donutSVG(96.3,'#38D6FF',104,9);
  document.getElementById('ringDist').innerHTML=donutMulti(DIST,104,11);
  document.getElementById('ringStore').innerHTML=donutSVG(63,'#38D6FF',88,8);
  document.getElementById('ringHealth').innerHTML=donutSVG(98.2,'#2bd46e',88,8);
  document.getElementById('distList').innerHTML=DIST.map(function(d){
    return '<div class="dist-row"><i style="background:'+d.color+'"></i><span>'+d.name+'</span><b>'+d.val+
      '</b><em>'+d.pct.toFixed(1)+'%</em></div>';
  }).join('');
  /* 9 宫格 */
  document.getElementById('vgrid9').innerHTML=VIDEO_CAMS.map(function(c,i){
    var badge=(c.level&&c.level!=='ok')?'<span class="vbadge '+c.level+'">'+c.badge+'</span>':'<span></span>';
    return '<div class="vtile" data-i="'+i+'">'+camSVG(c.type,'c'+i)+
      '<img src="'+c.img+'" alt="" onerror="this.remove()">'+
      '<div class="vh"><span class="vname">'+c.no+' '+c.name+'</span><span class="vtime"><i class="rec"></i>2026-11-16 '+c.time+'</span></div>'+
      '<div class="vf">'+badge+'<span class="vstate"><i></i>在线</span></div>'+
      '<button class="vexpand" aria-label="放大"><svg viewBox="0 0 10 10"><path d="M1 4V1h3M9 6v3H6M4 1v3H1M6 9V6h3"/></svg></button>'+
      '</div>';
  }).join('');
  /* 异常抓拍 */
  document.getElementById('snapGrid').innerHTML=SNAPS.map(function(s,i){
    return '<div class="snap'+(s.alert?' alert':'')+'">'+camSVG(s.type,'s'+i)+
      '<img src="'+s.img+'" alt="" onerror="this.remove()">'+
      '<span class="st">2026-11-16 '+s.t+'</span><span class="sl">'+s.loc+'</span></div>';
  }).join('');
  /* 快速回放 */
  document.getElementById('quickGrid').innerHTML=QUICK.map(function(q,i){
    return '<div class="qitem" data-i="'+i+'">'+camSVG(q.type,'q'+i)+
      '<img src="'+q.img+'" alt="" onerror="this.remove()">'+
      '<div class="qplay"><svg viewBox="0 0 10 10"><path d="M2 1l7 4-7 4z"/></svg></div>'+
      '<div class="qcap"><span>'+q.loc+'</span><span>'+q.t+' · '+q.dur+'</span></div></div>';
  }).join('');
  renderAlarms();
  setTL(43);
  /* 事件 */
  document.getElementById('vgrid9').addEventListener('click',function(e){
    var t=e.target.closest('.vtile');
    if(t) openVF(+t.dataset.i);
  });
  document.getElementById('quickGrid').addEventListener('click',function(e){
    var t=e.target.closest('.qitem');
    if(t) openVF((+t.dataset.i)%VIDEO_CAMS.length);
  });
  document.getElementById('vfClose').addEventListener('click',closeVF);
  document.addEventListener('keydown',function(e){if(e.key==='Escape') closeVF();});
  Array.prototype.forEach.call(document.querySelectorAll('#alarmTabs button'),function(b){
    b.addEventListener('click',function(){
      alarmFilter=b.dataset.filter;
      Array.prototype.forEach.call(document.querySelectorAll('#alarmTabs button'),function(x){
        x.classList.toggle('on',x===b);
      });
      renderAlarms();
    });
  });
  var track=document.getElementById('tlTrack');
  function fromEvent(e){
    var r=track.getBoundingClientRect();
    setTL((e.clientX-r.left)/r.width*100);
  }
  track.addEventListener('pointerdown',function(e){tlDrag=true;fromEvent(e);track.setPointerCapture&&track.setPointerCapture(e.pointerId);});
  window.addEventListener('pointermove',function(e){if(tlDrag) fromEvent(e);});
  window.addEventListener('pointerup',function(){tlDrag=false;});
  document.getElementById('tlPlay').addEventListener('click',toggleTL);
  document.getElementById('tlPrev').addEventListener('click',function(){setTL(tlPct-2);});
  document.getElementById('tlNext').addEventListener('click',function(){setTL(tlPct+2);});
  Array.prototype.forEach.call(document.querySelectorAll('.tl-range button'),function(b){
    b.addEventListener('click',function(){
      Array.prototype.forEach.call(document.querySelectorAll('.tl-range button'),function(x){x.classList.toggle('on',x===b);});
    });
  });
}

/* ============================================================
   子页面：环境设备 / 生产管理 / 能耗管理 / 质量追溯
   ============================================================ */
var PAGE_VIEWS=['overview','env','video','production','energy','trace'];
var subBuilt={};

/* ---------------- 通用 ---------------- */
function heatColor(t){
  t=Math.max(0,Math.min(1,t));
  var stops=[[18,52,71],[35,110,170],[46,143,232],[56,214,255],[242,179,61],[229,86,75]];
  var f=t*(stops.length-1),i=Math.min(stops.length-2,Math.floor(f)),k=f-i;
  var a=stops[i],b=stops[i+1];
  return 'rgb('+Math.round(a[0]+(b[0]-a[0])*k)+','+Math.round(a[1]+(b[1]-a[1])*k)+','+Math.round(a[2]+(b[2]-a[2])*k)+')';
}
function fmtNum(v){return v>=10000?(v/1000).toFixed(1)+'k':v.toLocaleString('en-US');}

/* ---------------- 环境设备页 ---------------- */
var ENV_METERS=[['温度达标',98.1],['湿度达标',95.2],['CO₂ 达标',94.7],['光照达标',97.5],['风速达标',96.3]];
function buildEnvPage(){
  if(subBuilt.env) return;
  subBuilt.env=1;
  var ring=document.getElementById('envHouseRing');
  if(ring) ring.innerHTML=donutSVG(78,'#38D6FF',92,8);
  var m=document.getElementById('envMeters');
  if(m) m.innerHTML=ENV_METERS.map(function(x){
    return '<div class="meter"><span>'+x[0]+'</span><div class="track"><i style="width:'+x[1]+'%"></i></div><b>'+x[1].toFixed(1)+'%</b></div>';
  }).join('');
  var co2=document.getElementById('envPageCo2Chart');
  if(co2) lineChart(co2,{labels:['00','02','04','06','08','10','12','14','16','18','20','22'],
    series:[{color:'#2bd46e',data:[640,632,628,635,652,668,678,690,682,672,660,650],min:580,max:760}],padL:26});
  var tr=document.getElementById('envTrendChart');
  if(tr) lineChart(tr,{labels:['00','04','08','12','16','20','24'],
    series:[{color:'#38D6FF',data:[18.1,18.0,18.2,18.6,18.8,18.3,18.2],min:16,max:21},
            {color:'#2bd46e',data:[92.1,92.4,92.8,93.1,92.6,92.2,92.5],min:86,max:96}]});
  if(state.house) refreshEnvPage(envData(state.house));
}
function refreshEnvPage(d){
  if(!subBuilt.env||!d) return;
  var g=function(id){return document.getElementById(id);};
  g('envPageCo2Sub').textContent=d.name;
  g('envPageRange').textContent=d.range;
  g('envPageCo2').textContent=d.co2;
  renderGauge(d.co2,d.status,'envPageGauge');
  var st=g('envPageCo2Status');
  st.className='st'+(d.status==='正常'?'':d.status==='预警'?' warn':' risk');
  st.innerHTML='<i></i>'+d.status;
  g('envPageDevSub').textContent=d.name+' · '+d.dev.total+' 台';
  g('envPageDevTotal').innerHTML=d.dev.total+'<i>台</i>';
  g('envPageDevRun').innerHTML=d.dev.run+'<i>台</i>';
  g('envPageDevIdle').innerHTML=d.dev.idle+'<i>台</i>';
  g('envPageDevErr').innerHTML=d.dev.err+'<i>台</i>';
}

/* ---------------- 生产管理页 ---------------- */
var PROC_SEEDS=['香菇 808','金针菇 F21','平菇 P9','杏鲍菇 X3'];
var PROC_STEPS=[
  {name:'拌料',batches:18,pass:99.2,cycle:0.5,done:12,rate:96},
  {name:'装袋',batches:22,pass:98.6,cycle:0.8,done:16,rate:94},
  {name:'灭菌',batches:16,pass:97.9,cycle:1.2,done:9,rate:88},
  {name:'接种',batches:20,pass:99.1,cycle:0.6,done:14,rate:91},
  {name:'培养',batches:32,pass:96.8,cycle:18.4,done:20,rate:86},
  {name:'出菇',batches:28,pass:96.4,cycle:5.2,done:12,rate:92},
  {name:'采收',batches:14,pass:95.8,cycle:0.4,done:10,rate:84}
];
PROC_STEPS.forEach(function(s,i){
  s.codes=[0,1,2].map(function(j){return 'SC-1116-'+('00'+(21+i*3+j)).slice(-3);});
  s.seeds=[0,1,2].map(function(j){return PROC_SEEDS[(i+j)%4];});
  s.qty=[0,1,2].map(function(j){return 120+j*60+i*10;});
  s.prog=[0,1,2].map(function(j){return 92-j*16;});
});
var PROC_SEL=5;

function renderLane(sel){
  PROC_SEL=(sel===undefined)?PROC_SEL:sel;
  var host=document.getElementById('procLane');
  if(!host) return;
  var W=1120,H=452;
  var s='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet">';
  PROC_STEPS.forEach(function(st,i){
    var x=8+i*158,on=(i===PROC_SEL);
    s+='<rect x="'+x+'" y="6" width="150" height="'+(H-12)+'" rx="8" fill="'+(on?'rgba(56,214,255,.1)':'rgba(18,36,70,.35)')+'" stroke="'+(on?'rgba(56,214,255,.55)':'rgba(110,170,255,.16)')+'"/>';
    s+='<rect x="'+x+'" y="6" width="150" height="36" rx="8" fill="'+(on?'rgba(56,214,255,.22)':'rgba(46,143,232,.13)')+'"/>';
    s+='<text x="'+(x+75)+'" y="30" text-anchor="middle" font-size="13" font-weight="700" fill="'+(on?'#EAFBFF':'#CFE6FF')+'">'+st.name+'</text>';
    for(var j=0;j<3;j++){
      var by=54+j*104;
      s+='<rect x="'+(x+9)+'" y="'+by+'" width="132" height="90" rx="6" fill="rgba(8,20,36,.75)" stroke="rgba(110,170,255,.2)" data-tip="'+st.codes[j]+' · '+st.seeds[j]+' · '+st.qty[j]+' 袋 · 进度 '+st.prog[j]+'%"/>';
      s+='<text x="'+(x+17)+'" y="'+(by+18)+'" font-size="9.5" fill="#8FEBFF" font-family="DIN Alternate,Segoe UI">'+st.codes[j]+'</text>';
      s+='<text x="'+(x+17)+'" y="'+(by+38)+'" font-size="10.5" fill="#E8F2FF">'+st.seeds[j]+'</text>';
      s+='<text x="'+(x+17)+'" y="'+(by+59)+'" font-size="9.5" fill="#9DB8DC">'+st.qty[j]+' 袋</text>';
      s+='<rect x="'+(x+17)+'" y="'+(by+70)+'" width="112" height="4" rx="2" fill="rgba(110,170,255,.16)"/>';
      s+='<rect x="'+(x+17)+'" y="'+(by+70)+'" width="'+(112*st.prog[j]/100)+'" height="4" rx="2" fill="'+(on?'#38D6FF':'#2E8FE8')+'"/>';
      s+='<text x="'+(x+129)+'" y="'+(by+84)+'" text-anchor="end" font-size="8.5" fill="#7FA6CC">'+st.prog[j]+'%</text>';
    }
    s+='<text x="'+(x+14)+'" y="'+(H-26)+'" font-size="9.5" fill="#9DB8DC">在制 '+st.batches+' 批 · 合格 '+st.pass+'%</text>';
    s+='<text x="'+(x+136)+'" y="'+(H-26)+'" text-anchor="end" font-size="10.5" font-family="DIN Alternate,Segoe UI" fill="'+(on?'#38D6FF':'#7FA6CC')+'">'+st.rate+'%</text>';
  });
  s+='</svg>';
  host.innerHTML=s;
  updateProdDetail(PROC_SEL);
}
function updateProdDetail(i){
  var st=PROC_STEPS[i];if(!st) return;
  document.getElementById('prodStepTitle').textContent=st.name+'工序 · 批次明细';
  document.getElementById('prodStepSub').textContent='在制 '+st.batches+' 批 · 达成率 '+st.rate+'%';
  document.getElementById('prodStepBatch').textContent=st.batches;
  document.getElementById('prodStepDone').textContent=st.done;
  document.getElementById('prodStepPass').innerHTML=st.pass+'<i>%</i>';
  document.getElementById('prodStepCycle').innerHTML=st.cycle+'<i>天</i>';
  var tb=document.getElementById('prodBatchTable');
  if(!tb) return;
  var rows='';
  for(var j=0;j<3;j++){
    var ok=j===0;
    rows+='<tr><td>'+st.codes[j]+'</td><td>'+st.seeds[j]+'</td><td class="n">'+st.qty[j]+'</td><td class="n">'+st.prog[j]+'%</td><td class="'+(ok?'ok':'warn')+'">'+(ok?'合格':'待检')+'</td></tr>';
  }
  tb.innerHTML='<thead><tr><th>批次号</th><th>菌种</th><th>数量(袋)</th><th>进度</th><th>质检</th></tr></thead><tbody>'+rows+'</tbody>';
}
function buildProdPage(){
  if(subBuilt.prod) return;
  subBuilt.prod=1;
  document.getElementById('prodSeedRing').innerHTML=donutMulti([
    {pct:38,color:'#38D6FF',name:'香菇 808'},{pct:27,color:'#2E8FE8',name:'金针菇 F21'},
    {pct:21,color:'#F2B33D',name:'平菇 P9'},{pct:14,color:'#9A7BFF',name:'杏鲍菇 X3'}],92,9);
  document.getElementById('prodSeedList').innerHTML=[['香菇 808','38%','#38D6FF'],['金针菇 F21','27%','#2E8FE8'],['平菇 P9','21%','#F2B33D'],['杏鲍菇 X3','14%','#9A7BFF']].map(function(x){
    return '<div><i style="background:'+x[2]+'"></i><span>'+x[0]+'</span><b>'+x[1]+'</b></div>';
  }).join('');
  document.getElementById('prodRateList').innerHTML=PROC_STEPS.map(function(s,i){
    return '<div class="rrow"><span class="rk">0'+(i+1)+'</span><span class="nm">'+s.name+'</span><span class="track"><i style="width:'+s.rate+'%"></i></span><b>'+s.rate+'%</b></div>';
  }).join('');
  document.getElementById('prodTaskList').innerHTML=[
    ['灭菌排产确认',82],['接种班组交接',76],['出菇房温控复核',66],['采收计划下达',58],['包装物料补货',44]
  ].map(function(x,i){
    return '<div class="rrow"><span class="rk">0'+(i+1)+'</span><span class="nm">'+x[0]+'</span><span class="track"><i style="width:'+x[1]+'%"></i></span><b>'+x[1]+'%</b></div>';
  }).join('');
  var day=document.getElementById('prodDayChart');
  if(day) lineChart(day,{labels:['00','04','08','12','16','20','24'],
    series:[{color:'#38D6FF',data:[160,190,380,640,510,330,210],min:0,max:720}],padL:28});
  var tr=document.getElementById('prodTrendChart');
  if(tr) lineChart(tr,{labels:['11-10','11-11','11-12','11-13','11-14','11-15','11-16'],
    series:[{color:'#38D6FF',data:[2980,3120,2860,3210,3090,3340,3245],min:2400,max:3600}],padL:34});
  var st=document.getElementById('prodStepChart');
  if(st) barChart(st,{labels:['拌料','装袋','灭菌','接种','培养','出菇','采收'],
    bars:[3590,3480,3120,2980,2560,715,715],line:[96,94,88,91,86,92,84]});
  var lane=document.getElementById('procLane');
  if(lane) lane.addEventListener('click',function(e){
    var svg=lane.querySelector('svg');if(!svg) return;
    var r=svg.getBoundingClientRect();
    var vx=(e.clientX-r.left)/r.width*1120;
    var idx=Math.floor((vx-8)/158);
    idx=Math.max(0,Math.min(6,idx));
    if(idx!==PROC_SEL) renderLane(idx);
  });
  renderLane(PROC_SEL);
}

/* ---------------- 能耗管理页 ---------------- */
var ENERGY_ITEMS=[
  {name:'制冷机组',val:986,color:'#38D6FF'},
  {name:'加湿系统',val:642,color:'#2E8FE8'},
  {name:'通风系统',val:518,color:'#4FA9FF'},
  {name:'照明系统',val:276,color:'#F2B33D'},
  {name:'包装设备',val:238,color:'#9A7BFF'},
  {name:'其他',val:183,color:'#31C9E8'}
];
var ENERGY_ROOMS=[
  ['出菇房 A 区',486,2.82],['出菇房 B 区',452,2.64],['培养房 1',398,2.21],['接种间',312,2.48],
  ['冷却间',286,2.86],['出菇房 C 区',268,1.92],['灭菌间',242,2.35],['包装间',96,0.64],
  ['冷链暂存',188,1.72],['设备间',84,0.92],['办公区',62,0.38],['仓库',58,0.31]
];
function buildEnergyPage(){
  if(subBuilt.energy) return;
  subBuilt.energy=1;
  var total=ENERGY_ITEMS.reduce(function(a,b){return a+b.val;},0);
  document.getElementById('energyRing').innerHTML=donutMulti(ENERGY_ITEMS.map(function(x){
    return {pct:Math.round(x.val/total*1000)/10,color:x.color,name:x.name};
  }),92,9);
  document.getElementById('energyList').innerHTML=ENERGY_ITEMS.map(function(x){
    return '<div><i style="background:'+x.color+'"></i><span>'+x.name+'</span><b>'+Math.round(x.val/total*100)+'%</b></div>';
  }).join('');
  document.getElementById('energyPeakList').innerHTML=[
    ['尖峰 10:00-12:00','42%',92],['高峰 08:00-10:00','34%',74],['平段 12:00-18:00','18%',46],['低谷 22:00-06:00','6%',18]
  ].map(function(x,i){
    return '<div class="rrow"><span class="rk">0'+(i+1)+'</span><span class="nm">'+x[0]+'</span><span class="track"><i style="width:'+x[2]+'%"></i></span><b>'+x[1]+'</b></div>';
  }).join('');
  document.getElementById('energyUnitList').innerHTML=[
    ['香菇 808',1.12],['金针菇 F21',0.96],['平菇 P9',0.88],['杏鲍菇 X3',0.81],['秀珍菇 S2',0.74]
  ].map(function(x,i){
    return '<div class="rrow"><span class="rk">0'+(i+1)+'</span><span class="nm">'+x[0]+'</span><span class="track"><i style="width:'+(x[1]/1.2*100)+'%"></i></span><b>'+x[1].toFixed(2)+'</b></div>';
  }).join('');
  document.getElementById('energyDevList').innerHTML=[
    ['制冷机组 1#',986],['加湿器 3#',412],['循环风机 A',286],['CO₂ 发生器',232],['包装线 2#',176],['冷库机组',148]
  ].map(function(x,i){
    return '<div class="rrow"><span class="rk">0'+(i+1)+'</span><span class="nm">'+x[0]+'</span><span class="track"><i style="width:'+(x[1]/1000*100)+'%"></i></span><b>'+x[1]+'</b></div>';
  }).join('');
  var day=document.getElementById('energyDayChart');
  if(day) lineChart(day,{labels:['00','04','08','12','16','20','24'],
    series:[{color:'#F2B33D',data:[168,152,286,420,368,252,196],min:0,max:480}],padL:28});
  var bar=document.getElementById('energyBarChart');
  if(bar) barChart(bar,{labels:['制冷','加湿','通风','照明','包装','其他'],
    bars:[986,642,518,276,238,183],line:[1.12,0.96,0.88,0.74,0.81,0.62]});
  var cv=document.getElementById('energyCurveChart');
  if(cv) lineChart(cv,{labels:['00','03','06','09','12','15','18','21','24'],
    series:[{color:'#38D6FF',data:[86,72,104,182,240,206,168,112,92],min:0,max:280}],padL:30});
  renderHeat();
}
function renderHeat(){
  var host=document.getElementById('heatMap');if(!host) return;
  var s='<svg viewBox="0 0 1120 660" preserveAspectRatio="xMidYMid meet">';
  var max=486;
  ENERGY_ROOMS.forEach(function(r,i){
    var c=i%4,row=Math.floor(i/4),x=10+c*278,y=8+row*214,w=262,h=200;
    var t=r[1]/max;
    s+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="8" fill="'+heatColor(t)+'" opacity="'+(0.28+t*0.6)+'" stroke="rgba(150,220,250,'+(0.2+t*0.5)+')" data-tip="'+r[0]+' · '+r[1]+' kWh · '+r[2].toFixed(2)+' kWh/㎡"/>';
    s+='<text x="'+(x+15)+'" y="'+(y+30)+'" font-size="13" fill="#EAF6FF">'+r[0]+'</text>';
    s+='<text x="'+(x+15)+'" y="'+(y+76)+'" font-size="30" font-family="DIN Alternate,Segoe UI" font-weight="700" fill="#FFFFFF">'+r[1]+'</text>';
    s+='<text x="'+(x+15)+'" y="'+(y+96)+'" font-size="10" fill="rgba(232,246,255,.75)">kWh</text>';
    s+='<text x="'+(x+15)+'" y="'+(y+140)+'" font-size="10.5" fill="rgba(232,246,255,.66)">强度 '+r[2].toFixed(2)+' kWh/㎡</text>';
    s+='<rect x="'+(x+15)+'" y="'+(y+158)+'" width="'+(w-30)+'" height="5" rx="2.5" fill="rgba(0,0,0,.28)"/>';
    s+='<rect x="'+(x+15)+'" y="'+(y+158)+'" width="'+((w-30)*t)+'" height="5" rx="2.5" fill="rgba(255,255,255,.82)"/>';
  });
  s+='</svg>';
  host.innerHTML=s;
}

/* ---------------- 质量追溯页 ---------------- */
var PROV_RANK=[['浙江',2860],['江苏',2240],['广东',1980],['上海',1420],['北京',1180],['山东',960],['福建',820],['四川',640],['河南',520],['湖北',460],['湖南',380],['安徽',340],['辽宁',300],['陕西',260]];
var CN_MAP={
  "北京":{d:"M419.1 187.6L420.3 186.3L415.3 186.4L411.8 182.4L409.2 184.3L410.5 186.3L404.3 189.9L406.7 193.2L402.2 196.7L403.4 202.1L409.8 201.5L412.2 203.1L412.9 201.0L415.4 200.8L416.6 198.3L414.6 195.2L420.0 192.6L417.9 188.8L419.1 187.6Z",c:[411.0,193.6],s:19.4},
  "天津":{d:"M424.9 202.1L426.2 199.7L423.6 200.0L421.7 196.0L423.9 193.7L420.2 191.8L418.4 194.3L419.0 199.7L415.5 200.5L417.3 206.8L415.9 207.9L416.2 211.5L421.4 213.4L425.7 211.3L424.7 209.5L426.6 208.9L426.4 205.5L428.0 203.9L425.3 202.4L422.8 203.2L424.9 202.1Z",c:[421.1,204.0],s:17.0},
  "河北":{d:"M420.1 186.6L418.3 190.5L423.9 193.7L421.6 195.5L423.6 200.0L426.2 199.7L425.4 202.6L432.6 207.4L433.0 204.5L436.3 204.1L439.2 200.6L440.7 193.6L443.7 192.2L439.7 185.2L436.9 185.7L432.6 182.7L435.3 176.0L427.1 176.8L424.4 172.1L426.1 170.5L425.4 167.8L423.8 168.3L419.8 161.4L412.3 165.1L411.8 170.6L407.4 170.9L405.7 173.9L403.1 172.1L397.8 177.4L394.6 177.3L394.0 171.0L391.2 170.8L388.3 175.5L388.9 179.0L385.8 180.3L387.3 182.7L385.6 184.6L391.0 193.4L393.1 193.5L387.7 198.3L392.4 199.7L394.4 203.3L392.9 209.8L388.6 210.3L388.4 214.3L386.0 217.1L386.1 220.8L389.0 221.8L391.1 227.6L392.6 227.8L389.6 234.8L389.9 238.6L387.1 240.7L390.1 244.9L402.2 247.8L404.0 245.5L406.1 246.9L407.7 245.9L405.1 241.7L408.7 237.4L410.9 230.3L413.4 229.7L414.0 226.8L415.1 228.1L418.2 222.9L424.3 222.1L427.0 218.1L428.4 214.8L426.7 215.1L425.0 212.0L421.4 213.4L416.2 211.5L415.9 207.9L417.3 206.8L415.5 200.5L412.9 201.0L412.2 203.1L409.8 201.5L405.7 202.9L402.4 200.2L403.5 199.3L402.2 196.7L406.7 193.2L404.3 189.9L410.5 186.3L409.2 184.3L411.6 182.5L415.3 186.4L420.1 186.6Z",c:[395.6,222.8],s:72.2},
  "山西":{d:"M358.1 269.8L370.0 265.9L372.2 263.0L374.8 262.9L374.5 260.0L381.8 260.4L389.8 254.3L390.1 244.9L387.1 240.7L389.9 238.6L389.6 234.8L392.6 227.8L391.1 227.6L389.0 221.8L386.1 220.8L385.9 217.9L388.4 214.3L387.6 211.5L393.7 208.5L394.4 203.3L392.4 199.7L387.7 198.3L393.1 193.5L391.0 193.4L388.9 188.9L388.5 191.6L384.0 194.3L379.0 194.5L376.5 197.3L372.4 196.4L369.4 204.7L365.2 204.5L364.1 207.5L362.1 208.0L363.2 209.3L360.9 213.7L360.2 220.3L356.9 223.8L360.1 231.8L356.5 238.9L359.7 256.5L356.4 266.3L358.1 269.8Z",c:[374.8,230.0],s:59.4},
  "内蒙古":{d:"M232.5 163.8L237.5 178.7L235.3 181.3L241.4 188.4L241.2 192.9L244.4 190.5L245.5 192.7L247.4 190.5L248.4 192.0L249.2 189.7L257.5 189.5L259.0 192.0L258.1 197.6L251.0 202.2L258.5 205.2L260.7 208.9L264.0 209.0L264.9 214.9L267.5 214.1L268.3 217.2L272.6 218.8L275.5 216.0L273.3 213.4L279.3 211.4L284.5 213.5L287.8 210.6L294.9 209.6L295.9 215.1L288.3 222.5L289.4 225.7L287.7 227.2L288.1 229.4L295.6 235.3L311.0 230.3L312.9 216.1L315.8 211.6L318.9 210.1L320.6 210.1L322.5 214.5L318.6 224.3L324.8 225.6L327.0 228.2L332.6 230.1L333.1 231.8L340.4 231.1L340.4 226.5L341.8 228.0L343.1 226.7L341.7 224.4L342.7 221.4L350.6 212.5L350.4 210.4L353.4 210.1L352.6 207.9L357.3 210.1L361.9 205.7L361.6 208.4L363.9 207.7L365.2 204.5L369.4 204.7L372.4 196.4L376.5 197.3L379.0 194.5L383.5 194.5L388.5 191.6L388.0 186.6L385.6 184.6L387.3 182.7L385.7 180.5L388.9 179.0L388.3 175.5L391.2 170.8L394.0 171.0L394.6 177.3L397.8 177.4L403.1 172.1L405.7 173.9L407.4 170.9L411.8 170.6L412.3 165.1L419.8 161.4L423.8 168.3L425.4 167.8L426.1 170.5L424.4 172.1L427.4 177.1L435.0 176.5L436.5 172.6L433.7 164.8L435.7 162.1L439.1 163.9L442.4 170.0L445.0 164.4L452.6 158.4L455.5 158.4L457.1 154.9L461.2 154.2L461.2 152.1L465.2 153.1L468.3 151.0L468.2 148.9L471.0 148.3L471.3 143.5L467.6 142.6L469.2 140.5L466.6 134.2L463.5 130.2L456.6 134.8L453.3 126.9L454.1 122.1L450.9 117.3L448.0 117.1L449.1 113.4L453.1 115.6L454.5 113.8L457.5 116.0L457.1 111.4L460.0 108.6L457.8 104.8L462.6 102.5L462.1 100.0L461.5 100.9L459.3 99.1L460.3 101.0L457.4 102.9L455.4 98.9L451.1 96.1L463.7 78.7L466.0 83.9L466.8 83.0L466.8 70.7L469.9 69.2L467.9 58.0L471.3 51.5L470.3 49.4L471.9 45.3L463.0 39.5L461.6 43.2L458.3 45.2L452.5 44.8L450.7 46.7L447.2 46.9L442.5 38.3L443.4 35.9L438.0 33.6L436.8 36.5L434.9 36.5L430.2 33.9L434.0 28.0L432.8 25.5L431.2 24.6L426.1 26.3L421.0 33.2L421.7 35.4L426.9 35.2L428.0 39.7L427.4 42.6L423.4 46.3L418.1 63.1L420.0 63.2L420.3 65.6L408.9 75.2L399.5 72.3L393.8 89.6L394.3 92.8L392.0 94.3L392.7 97.2L396.1 99.8L398.5 97.1L402.9 96.3L408.3 98.9L411.3 93.8L417.6 93.3L428.7 101.8L431.3 108.0L426.9 109.5L422.7 108.0L417.6 109.1L413.2 112.5L410.3 112.1L410.2 114.9L403.5 116.5L401.7 123.3L397.1 127.8L387.1 129.8L383.9 135.5L379.8 138.6L372.8 138.0L369.0 135.3L364.3 135.9L360.6 145.0L365.9 153.0L357.9 158.2L350.1 167.4L338.7 171.0L326.1 170.6L310.4 177.4L303.7 182.1L299.2 181.0L299.2 178.3L289.0 178.1L276.7 173.4L274.4 169.9L265.9 167.4L253.5 168.1L232.5 163.8Z",c:[384.2,143.5],s:225.1},
  "辽宁":{d:"M478.3 188.6L484.1 188.0L488.0 179.1L495.7 172.3L494.4 170.5L495.6 167.2L489.4 159.9L490.3 155.7L488.6 155.9L483.1 148.7L482.3 144.4L479.3 148.7L476.7 144.2L471.8 141.8L471.0 148.3L468.2 148.9L468.3 151.0L465.2 153.1L461.2 152.1L461.2 154.2L457.1 154.9L455.5 158.4L452.6 158.4L445.0 164.4L442.4 170.0L439.1 163.9L435.7 162.1L434.0 164.0L436.5 173.8L432.6 182.7L436.9 185.7L439.7 185.2L443.5 191.9L449.0 188.3L453.5 178.9L459.8 177.6L464.6 181.6L462.4 185.6L463.2 186.9L457.2 195.3L458.0 197.5L462.3 197.0L462.0 200.7L457.2 203.5L458.1 206.0L463.2 203.2L462.5 201.5L465.0 201.6L470.6 193.5L478.3 188.6Z",c:[466.2,171.2],s:63.6},
  "吉林":{d:"M526.2 143.7L527.0 135.9L530.7 136.3L531.1 138.6L535.4 141.2L534.1 138.3L532.3 138.0L538.1 133.8L537.8 126.5L534.0 128.3L529.4 126.7L527.7 122.0L525.9 125.2L524.2 123.1L518.8 127.2L519.3 130.0L516.4 131.5L509.1 120.5L506.8 123.2L507.8 125.8L505.3 127.2L501.7 123.6L501.9 121.4L497.5 122.5L495.2 115.7L491.5 115.0L486.8 117.2L483.2 113.4L480.7 115.5L478.5 116.1L476.5 114.5L476.5 115.7L472.4 116.6L468.2 113.2L466.6 106.8L460.5 108.2L457.1 111.4L457.5 116.0L454.5 113.8L453.1 115.6L448.5 113.8L448.0 117.1L450.9 117.3L454.1 122.1L453.3 126.9L456.6 134.8L463.5 130.2L468.9 139.6L467.3 141.9L468.7 143.5L472.4 142.1L476.7 144.2L479.3 148.7L482.3 144.4L483.1 148.7L488.6 155.9L490.3 155.7L489.0 158.3L489.9 161.7L495.6 167.2L494.4 171.0L498.5 169.7L501.8 163.2L501.6 159.3L504.1 156.9L508.0 160.3L516.1 160.0L517.3 156.9L513.5 152.3L521.6 150.0L524.0 143.7L526.2 143.7Z",c:[492.2,134.9],s:77.2},
  "黑龙江":{d:"M463.4 108.3L466.6 106.8L468.2 113.2L472.4 116.6L476.5 115.7L476.5 114.5L478.5 116.1L480.7 115.5L483.2 113.4L486.8 117.2L491.5 115.0L495.2 115.7L497.5 122.5L501.9 121.4L501.7 123.6L505.3 127.2L507.8 125.8L506.8 123.2L509.1 120.5L516.4 131.5L519.3 130.0L518.8 127.2L524.2 123.1L525.9 125.2L527.7 122.0L529.4 126.7L536.5 127.8L537.6 126.5L535.9 119.8L530.3 110.8L534.4 108.0L536.5 102.6L546.6 104.0L547.8 102.2L546.8 98.6L550.2 86.7L548.5 73.2L552.0 67.0L549.2 64.4L549.2 60.8L551.9 57.6L537.2 66.0L534.0 69.4L534.0 72.3L521.1 75.9L517.3 71.9L518.1 69.2L514.6 66.0L514.9 62.5L511.4 63.6L503.9 58.4L500.6 60.0L497.2 57.9L489.8 59.6L486.8 57.4L486.3 52.3L483.8 51.5L482.4 46.6L478.6 43.6L478.4 40.4L477.2 41.1L477.6 39.5L472.7 33.8L472.9 31.4L467.1 26.5L467.9 24.6L464.3 24.2L463.2 21.7L459.3 21.0L457.5 22.7L446.1 19.2L432.6 23.7L431.2 24.6L434.2 27.5L430.2 33.9L436.0 36.8L438.0 33.6L443.4 35.9L442.5 38.3L447.2 46.9L450.7 46.7L452.5 44.8L458.3 45.2L461.6 43.2L463.0 39.5L471.9 45.3L470.3 49.4L471.3 51.5L467.9 58.0L469.9 69.2L466.8 70.7L466.8 83.0L466.0 83.9L463.7 78.7L451.1 96.1L455.4 98.9L457.7 103.0L460.3 101.0L459.3 99.1L461.5 100.9L462.1 100.0L462.6 102.5L457.8 104.8L460.0 108.6L463.4 108.3Z",c:[493.2,78.7],s:117.0},
  "上海":{d:"M471.5 303.5L476.1 307.1L483.3 303.5L479.5 298.4L475.1 296.5L471.5 303.5Z",c:[477.0,301.8],s:11.2},
  "江苏":{d:"M428.2 264.0L427.0 265.8L422.4 259.4L419.0 260.8L418.7 264.1L425.1 266.6L427.8 270.4L432.3 270.3L434.1 274.2L438.2 273.3L436.8 280.1L439.7 280.2L441.2 285.2L445.5 285.4L446.6 282.2L450.2 283.4L449.9 288.3L447.8 286.8L444.3 287.3L446.2 290.4L443.4 294.0L444.8 297.6L449.0 299.0L449.1 304.1L454.7 302.4L457.7 304.4L461.0 303.1L463.4 305.5L466.8 305.4L467.9 307.4L471.5 303.5L471.1 302.0L473.1 301.4L473.0 298.6L475.3 295.9L472.3 293.8L473.0 292.7L481.5 294.1L479.5 290.0L474.9 287.9L474.1 284.8L468.9 283.3L466.3 275.2L458.9 263.0L447.2 258.4L447.1 254.3L443.0 256.1L442.8 260.0L439.7 261.3L439.3 264.5L437.3 265.2L437.1 263.1L434.5 261.7L431.2 264.9L428.2 264.0Z",c:[453.1,281.0],s:57.9},
  "浙江":{d:"M450.3 341.6L454.4 341.7L454.1 345.2L456.9 351.3L460.9 351.2L464.2 347.5L466.6 351.8L471.8 349.4L475.4 352.4L476.7 344.3L478.3 342.5L481.2 343.0L478.7 341.7L479.1 339.8L481.5 340.2L483.4 336.4L485.0 336.8L483.2 331.9L485.3 328.9L482.8 325.4L486.9 326.2L486.1 319.5L484.2 318.9L486.9 315.3L482.3 314.9L474.6 309.4L476.0 306.5L472.8 305.6L472.5 303.3L469.5 304.4L467.9 307.4L466.8 305.4L458.4 303.6L456.9 310.4L454.8 311.3L457.0 314.0L451.6 315.5L452.4 320.2L451.2 323.0L444.5 330.6L449.6 336.7L450.3 341.6Z",c:[466.8,327.8],s:45.7},
  "安徽":{d:"M421.9 271.8L422.4 273.4L417.8 276.2L415.4 272.6L412.3 272.3L412.7 278.4L409.8 279.7L409.7 284.5L405.8 284.9L405.7 286.7L409.2 288.1L409.5 291.4L414.2 293.3L416.9 291.0L418.0 300.5L413.8 302.8L413.0 307.0L415.5 309.4L420.6 310.5L418.0 315.0L423.1 325.4L427.5 323.8L428.4 321.5L431.1 322.9L429.1 326.2L429.8 327.9L433.8 325.6L434.5 322.7L438.6 326.6L443.5 326.0L447.1 327.6L452.4 320.2L451.6 315.5L457.0 314.0L454.8 311.3L456.9 310.4L458.2 305.5L454.7 302.4L449.1 304.1L449.0 299.0L446.7 299.0L443.3 295.9L446.2 290.4L444.3 287.3L447.8 286.8L449.9 288.3L450.2 283.4L446.6 282.2L446.0 285.1L442.1 285.9L439.7 280.2L436.8 280.1L438.2 273.3L434.1 274.2L432.3 270.3L427.8 270.4L425.1 266.6L419.2 263.9L416.8 266.7L421.3 268.6L421.9 271.8Z",c:[431.6,298.4],s:58.3},
  "福建":{d:"M462.4 382.2L460.9 378.8L462.7 379.1L463.6 381.5L463.4 378.8L466.1 378.1L463.2 376.8L463.9 375.6L466.5 375.0L468.4 376.7L469.0 374.9L471.2 374.7L469.9 372.2L469.0 374.8L466.5 373.2L468.5 368.1L466.9 366.3L470.5 363.4L468.2 360.8L465.8 360.7L466.6 359.3L469.0 359.9L469.5 358.1L470.9 358.1L468.8 361.5L472.0 359.6L470.6 356.9L474.5 352.7L471.8 349.4L466.6 351.8L464.2 347.5L460.9 351.2L456.9 351.3L454.1 345.2L454.4 341.7L450.2 341.6L449.8 344.2L443.6 348.8L440.9 346.8L435.8 352.0L438.1 355.9L431.9 362.4L433.2 368.2L431.2 369.4L432.3 371.6L431.2 373.6L428.7 375.2L427.0 386.8L431.5 388.4L433.1 387.1L435.0 390.3L438.2 389.3L441.2 399.0L445.4 402.4L454.0 392.2L453.1 388.5L458.8 388.4L460.3 384.9L458.6 384.3L462.4 382.2Z",c:[449.3,370.0],s:54.1},
  "江西":{d:"M445.8 328.1L443.5 326.0L438.6 326.6L434.5 322.7L433.8 325.6L429.8 327.9L428.9 326.4L431.1 322.9L428.4 321.5L424.7 325.7L420.9 326.9L416.5 325.9L414.3 329.0L412.4 328.3L413.1 330.5L411.3 329.9L410.4 332.2L404.1 333.2L400.6 337.0L404.8 346.5L399.7 351.8L398.3 356.9L398.9 359.4L401.7 358.6L402.4 367.7L405.2 368.6L404.1 374.0L407.1 373.7L405.1 374.9L404.1 379.2L405.7 384.9L411.4 382.6L413.9 384.2L414.0 386.1L408.1 392.1L411.0 394.2L422.1 389.4L425.5 392.2L427.3 391.8L426.5 383.7L428.1 382.1L428.7 375.2L431.2 373.6L432.3 371.6L431.2 369.4L433.5 366.8L431.9 362.4L438.1 355.9L435.8 352.0L440.9 346.8L443.6 348.8L449.8 344.2L449.1 342.6L450.7 341.1L448.7 335.1L444.7 332.0L445.8 328.1Z",c:[421.8,353.4],s:62.6},
  "山东":{d:"M418.7 264.1L419.0 260.8L422.4 259.4L427.0 265.8L428.8 263.6L430.7 264.9L433.3 263.9L433.0 262.2L434.5 261.7L437.1 263.1L437.3 265.2L439.3 264.5L439.7 261.3L442.8 260.0L443.0 256.1L448.0 254.7L450.0 247.8L452.5 246.8L455.6 242.0L453.5 240.6L453.9 239.2L455.7 239.1L455.2 241.1L459.3 239.4L458.6 236.1L461.1 234.7L459.6 233.0L461.5 233.3L466.2 229.1L467.2 230.3L470.2 226.7L472.1 228.0L475.4 226.6L474.4 223.8L475.9 219.8L470.7 220.5L470.2 219.0L464.9 221.4L456.0 217.8L451.5 220.3L451.9 222.0L448.4 224.9L447.8 228.1L443.8 229.0L442.3 227.0L440.9 227.6L439.3 224.3L442.2 222.2L442.1 219.5L440.9 220.3L437.9 216.6L434.7 218.1L427.9 215.8L424.3 222.1L418.2 222.9L415.1 228.1L414.0 226.8L413.4 229.7L410.9 230.3L408.7 237.4L405.1 241.7L407.7 245.9L406.7 250.6L413.4 245.9L413.5 247.6L404.7 255.7L402.5 260.6L406.6 261.3L410.5 266.0L418.7 264.1Z",c:[434.0,239.9],s:61.7},
  "河南":{d:"M384.0 296.7L389.1 295.4L391.5 297.2L394.6 295.2L396.4 302.3L404.2 302.6L404.2 305.2L407.1 306.2L410.4 304.0L412.2 306.6L413.8 302.8L417.8 301.0L416.9 291.0L414.2 293.3L409.5 291.4L409.2 288.1L405.7 286.7L405.8 284.9L409.9 284.2L409.8 279.7L412.7 278.4L411.8 272.7L415.4 272.6L418.9 275.8L422.5 273.2L421.3 268.6L419.2 268.9L416.0 264.9L410.1 265.8L406.6 261.3L402.5 260.6L404.3 256.2L413.8 245.8L407.0 250.8L407.5 245.7L406.1 246.9L404.0 245.5L402.2 247.8L390.1 244.9L389.8 254.3L385.2 258.5L381.8 260.4L374.5 260.0L374.8 262.9L372.2 263.0L370.0 265.9L358.1 269.8L359.0 274.3L361.1 275.2L360.8 278.7L365.3 282.4L365.3 286.6L368.4 291.1L372.0 294.6L378.2 296.9L384.0 296.7Z",c:[391.7,276.3],s:63.0},
  "湖北":{d:"M366.0 287.6L365.1 286.6L362.5 288.7L361.1 286.9L357.5 288.2L351.2 287.0L349.4 288.7L353.2 289.6L353.2 292.0L357.1 293.2L357.7 294.9L355.8 296.1L351.7 295.7L350.5 299.5L351.8 306.8L357.6 310.5L358.6 313.7L357.6 318.3L355.5 317.1L350.1 322.7L349.4 320.9L347.8 322.3L346.6 320.7L344.2 322.8L342.9 321.7L340.1 323.0L341.9 325.9L341.4 330.7L339.8 331.3L341.3 332.9L342.9 331.0L348.5 339.5L349.9 340.0L351.4 334.8L355.0 331.7L358.6 331.1L361.5 333.0L363.5 331.8L362.5 327.5L366.3 326.4L376.7 328.6L382.2 333.1L386.5 331.7L388.5 329.1L389.1 330.5L389.9 329.3L389.4 333.1L391.5 333.3L395.7 327.8L398.1 332.7L396.7 335.3L400.1 337.9L404.1 333.2L410.4 332.2L411.3 329.9L413.1 330.5L412.4 328.3L414.3 329.0L416.5 325.9L420.9 326.9L423.1 325.4L418.0 315.0L420.9 311.2L418.4 309.0L415.5 309.4L410.4 304.0L407.1 306.2L404.2 305.2L404.2 302.6L400.0 301.8L398.0 303.3L395.3 300.5L394.6 295.2L391.5 297.2L389.1 295.4L380.0 297.5L372.0 294.6L366.0 287.6Z",c:[380.7,314.5],s:68.4},
  "湖南":{d:"M383.6 393.5L385.1 387.8L390.5 388.0L393.1 390.8L394.7 386.9L392.5 385.3L396.8 382.7L400.8 385.0L404.7 382.9L404.7 375.7L407.1 373.7L404.1 374.0L405.2 368.6L402.4 367.7L401.7 358.6L398.9 359.4L398.3 356.9L399.7 351.8L402.6 350.3L402.1 348.7L404.7 345.5L402.7 343.6L403.1 340.1L396.7 335.3L398.1 332.7L395.7 327.8L390.8 333.5L388.8 331.5L389.9 329.3L382.2 333.1L376.7 328.6L365.2 326.7L362.5 327.5L363.5 331.8L361.5 333.0L356.0 331.4L351.4 334.8L349.3 346.2L350.7 346.9L350.9 354.7L352.9 359.6L345.7 366.0L353.2 365.0L354.2 367.4L353.0 368.1L354.8 369.7L351.4 370.6L352.8 372.7L351.4 375.3L353.6 375.4L353.6 378.6L356.8 379.3L356.3 380.7L357.7 380.7L359.3 376.6L362.7 379.4L366.4 374.5L373.9 374.8L373.2 378.9L376.6 379.8L371.4 391.3L373.0 391.6L374.8 388.9L377.1 390.4L377.2 394.8L380.0 393.1L383.6 393.5Z",c:[377.6,357.4],s:64.8},
  "广东":{d:"M403.8 423.5L405.6 419.4L404.6 417.0L407.5 420.3L413.0 417.8L414.6 419.7L415.9 418.7L414.4 417.0L416.5 415.2L418.9 418.1L422.1 414.2L426.8 415.8L427.4 413.1L429.6 414.5L437.1 411.2L437.5 408.6L440.2 407.4L440.7 403.6L444.1 402.4L440.9 398.3L438.2 389.3L435.0 390.3L433.1 387.1L431.5 388.4L427.3 387.0L426.0 389.5L427.3 391.8L425.5 392.2L422.1 389.4L411.3 394.4L408.1 392.1L414.0 386.1L411.4 382.6L406.0 385.2L405.3 382.9L400.8 385.0L396.5 382.8L392.5 385.3L394.7 386.9L393.1 390.8L390.5 388.0L385.1 387.8L385.2 391.8L382.7 394.2L384.4 398.4L382.4 400.0L383.3 402.9L377.6 409.8L377.5 417.1L370.7 421.6L370.1 426.4L366.3 426.4L367.0 430.1L362.4 430.5L359.5 433.9L361.5 436.1L359.9 437.3L358.9 442.5L362.3 450.9L367.6 450.3L369.7 448.2L367.7 443.4L365.2 442.6L367.8 438.8L385.8 432.5L387.6 430.0L390.2 430.9L395.1 427.9L396.8 428.8L398.4 425.1L400.7 428.0L404.0 425.2L403.8 423.5Z",c:[401.1,409.7],s:76.7},
  "广西":{d:"M354.0 378.9L352.5 382.8L347.5 383.2L349.6 383.0L349.1 385.7L345.2 384.4L344.7 388.4L341.4 385.7L339.4 386.9L338.9 389.8L335.0 391.0L333.7 388.7L331.6 390.0L328.5 385.1L325.8 387.3L326.0 389.9L316.6 393.5L317.0 396.0L315.3 397.6L306.0 393.1L300.5 397.8L297.7 397.4L300.2 401.5L300.9 399.8L304.8 400.4L306.6 404.8L315.6 404.4L317.3 407.0L316.8 410.9L311.0 413.0L310.3 417.2L325.0 420.3L321.8 424.7L323.5 430.8L327.1 430.9L331.5 435.1L337.3 434.3L340.3 436.0L341.8 434.8L341.7 436.2L346.3 433.7L352.4 434.8L351.3 436.3L352.5 437.1L358.0 434.7L360.1 435.9L359.5 433.9L361.5 433.2L361.8 431.0L367.0 430.1L366.3 426.4L370.1 426.4L370.7 421.6L377.5 417.1L377.6 409.8L383.3 402.9L383.6 393.5L380.0 393.1L377.2 394.8L377.1 390.4L374.8 388.9L373.0 391.6L371.4 391.3L376.6 379.8L373.2 378.9L373.9 374.8L366.4 374.5L362.7 379.4L359.3 376.6L357.4 380.8L355.7 378.6L354.0 378.9Z",c:[347.3,406.8],s:74.2},
  "海南":{d:"M364.8 453.4L355.2 455.2L347.6 462.5L348.0 473.0L359.6 476.8L370.5 470.0L372.2 462.1L376.6 457.8L376.2 456.0L375.1 452.9L371.7 451.3L364.8 453.4Z",c:[361.1,463.9],s:27.2},
  "重庆":{d:"M318.6 348.5L320.0 348.2L319.6 344.6L321.6 346.9L320.7 348.9L322.3 349.4L325.5 343.8L328.1 345.3L329.5 344.2L329.6 339.9L333.4 339.6L334.7 342.6L339.5 341.0L339.9 346.0L343.3 346.6L342.8 350.2L344.1 348.1L344.6 351.6L348.4 352.0L350.7 346.9L349.3 346.2L350.5 341.0L347.5 336.5L346.0 337.6L345.7 334.1L342.9 331.0L341.3 332.9L339.8 331.3L341.4 330.7L341.9 325.9L340.1 323.0L342.9 321.7L344.2 322.8L346.6 320.7L347.8 322.3L349.4 320.9L350.1 322.7L355.5 317.1L357.6 318.3L357.6 310.5L353.4 309.0L353.3 307.1L348.6 307.1L346.4 304.4L339.1 301.3L339.7 302.6L337.7 304.3L340.9 308.0L337.2 310.4L333.9 319.4L330.0 318.9L330.4 321.3L325.6 329.1L322.2 329.4L320.3 325.7L316.8 327.4L312.0 324.4L309.3 327.9L311.5 331.2L306.9 335.8L308.1 338.6L311.1 338.9L312.2 343.3L316.7 343.7L318.6 348.5Z",c:[334.5,328.6],s:50.7},
  "四川":{d:"M261.1 364.5L260.6 366.7L263.3 370.6L264.7 370.1L263.3 372.3L265.9 374.9L265.8 377.0L268.0 379.3L271.1 379.1L276.4 375.6L277.9 377.5L281.2 375.6L280.1 363.8L286.9 357.7L287.7 355.4L286.3 354.5L287.9 352.2L291.3 351.2L291.0 346.7L297.3 347.3L295.5 348.4L297.7 352.2L295.9 354.6L298.9 357.2L304.3 354.0L306.6 355.3L307.0 358.9L318.0 357.5L316.8 353.4L313.4 353.7L312.6 351.3L310.6 351.1L310.4 348.6L314.1 345.5L318.7 349.0L316.7 343.7L312.2 343.3L311.1 338.9L308.5 338.9L307.2 337.0L306.8 335.3L311.5 331.2L309.3 327.9L312.4 324.3L316.8 327.4L320.3 325.7L322.2 329.4L325.7 329.1L330.4 321.3L330.0 318.9L333.9 319.4L337.2 310.4L340.9 308.0L337.7 304.3L340.2 300.6L334.7 302.1L328.9 297.4L326.6 298.7L325.0 295.2L318.4 296.5L314.4 293.3L309.8 295.5L308.4 292.6L308.2 295.1L305.5 296.5L299.9 296.0L296.3 293.7L297.6 291.5L296.4 287.8L297.6 287.5L295.5 286.5L295.1 284.0L284.8 281.2L285.0 277.7L282.3 274.7L279.6 277.6L274.3 278.9L277.6 284.4L274.7 288.4L270.8 289.6L270.3 287.7L272.1 285.5L271.2 283.5L268.8 289.8L267.3 288.1L263.6 288.1L263.6 295.2L258.8 294.8L258.2 296.7L255.8 293.7L252.7 295.0L253.0 292.5L250.6 289.7L248.7 293.6L244.2 291.5L239.2 286.1L236.2 275.6L231.2 273.6L228.8 274.5L228.2 277.1L225.5 278.2L225.7 281.0L229.0 283.7L224.3 289.9L225.5 293.1L232.9 297.6L234.5 304.3L239.1 310.4L237.8 311.9L236.5 310.7L235.9 312.5L239.3 318.2L239.8 348.0L241.9 351.2L242.5 346.6L246.1 343.0L250.8 349.8L249.0 352.0L251.9 357.5L256.1 355.2L261.1 364.5Z",c:[279.0,321.0],s:111.1},
  "贵州":{d:"M350.3 348.0L348.4 352.0L344.9 351.7L344.1 348.1L342.8 350.2L343.3 346.6L339.9 346.0L339.5 341.0L334.7 342.6L333.4 339.6L330.0 339.6L329.5 344.2L328.1 345.3L325.5 343.8L322.3 349.4L320.7 348.9L321.6 346.9L319.6 344.6L320.0 348.2L318.7 349.0L314.1 345.5L310.4 348.6L310.6 351.1L312.6 351.3L313.4 353.7L317.5 354.3L317.3 358.1L310.5 359.4L307.5 358.4L305.6 363.2L302.2 364.2L296.5 361.9L294.4 364.5L291.8 362.2L288.0 367.0L289.9 368.4L289.8 373.0L293.2 373.9L297.2 371.5L300.0 375.7L295.8 384.9L301.6 390.1L298.2 396.4L300.5 397.8L306.0 393.1L315.3 397.6L317.0 396.0L316.6 393.5L326.0 389.9L325.8 387.3L328.5 385.1L331.6 390.0L333.7 388.7L335.8 391.1L338.9 389.8L341.0 385.8L344.7 388.4L345.2 384.4L349.1 385.7L349.6 383.0L347.5 383.2L352.5 382.8L354.3 377.7L353.6 375.4L351.4 375.3L352.8 372.7L351.4 370.6L353.6 369.8L353.8 366.0L352.6 364.8L345.7 366.0L352.9 359.6L350.3 348.0Z",c:[324.5,369.8],s:62.2},
  "云南":{d:"M307.0 358.9L306.6 355.3L304.3 354.0L302.3 356.3L298.2 356.8L295.9 354.6L297.5 351.8L295.4 350.1L297.3 347.3L291.0 346.7L291.3 351.2L287.9 352.2L286.3 354.5L287.7 355.4L286.9 357.7L280.1 363.8L281.8 373.2L280.9 375.9L277.9 377.5L276.4 375.6L271.1 379.1L268.0 379.3L263.6 373.0L264.7 370.1L263.3 370.6L260.6 366.7L261.1 364.5L256.1 355.2L252.1 357.5L250.4 355.1L249.0 352.0L250.8 349.8L246.1 343.0L242.5 346.6L241.2 350.6L239.8 348.0L239.8 337.9L238.4 338.0L238.0 342.7L236.7 343.0L236.1 340.5L234.3 340.9L234.7 350.1L231.1 351.4L230.3 347.9L228.3 350.8L229.8 358.8L231.3 357.1L234.1 358.7L234.2 370.5L233.1 376.6L231.5 376.6L232.7 380.0L230.7 380.1L228.1 383.7L226.5 382.6L225.9 385.5L220.9 389.0L221.6 392.0L218.6 393.1L218.2 396.8L219.8 396.8L220.5 400.5L217.7 403.2L218.9 404.4L224.3 401.7L233.3 401.5L230.7 405.7L233.0 408.1L232.7 413.3L240.0 415.5L240.4 417.2L237.3 419.4L237.9 422.5L235.1 426.5L244.6 428.3L244.6 432.7L246.2 432.8L247.3 435.8L251.3 436.1L257.9 432.4L258.8 439.1L265.2 440.4L266.2 434.7L263.1 426.8L264.7 423.9L271.6 424.8L274.6 420.5L280.5 424.8L284.0 420.3L286.4 423.0L287.8 420.5L291.5 424.2L293.3 420.4L295.0 420.0L296.3 421.9L300.5 420.2L302.2 416.0L307.3 413.2L309.9 415.7L311.0 413.0L316.8 410.9L317.3 407.0L315.0 404.0L306.6 404.8L304.8 400.4L300.9 399.8L300.2 401.5L298.7 400.2L297.7 397.4L301.6 390.1L295.8 384.9L299.8 375.0L297.2 371.5L290.4 373.7L289.9 368.4L288.0 367.0L291.8 362.2L294.4 364.5L296.5 361.9L299.3 364.0L305.6 363.2L307.0 358.9Z",c:[263.6,392.2],s:101.1},
  "西藏":{d:"M152.0 240.5L139.5 233.5L119.7 233.4L117.5 234.0L115.5 237.4L110.7 238.9L105.5 236.6L95.7 239.6L85.6 236.9L84.8 233.2L80.1 231.5L74.7 235.4L71.1 235.7L59.5 230.0L57.4 231.5L58.0 232.8L54.3 234.2L50.2 240.5L42.5 239.2L40.5 242.2L37.7 242.3L36.5 247.7L39.6 254.8L39.6 260.8L38.4 263.3L35.0 264.8L33.9 259.6L29.8 260.8L29.2 265.9L31.6 269.0L30.1 270.2L31.3 273.3L29.5 276.2L31.1 280.7L37.7 283.3L40.3 288.9L49.5 295.9L49.8 299.0L53.1 297.4L54.0 294.8L60.9 297.4L60.9 301.0L70.9 309.7L73.3 315.4L79.1 315.2L79.3 320.4L81.5 322.9L85.1 325.8L88.9 325.8L87.3 329.1L92.3 331.3L93.9 330.1L95.8 336.5L98.4 333.6L98.4 336.1L100.2 337.3L103.8 335.5L108.8 340.1L118.5 341.2L126.0 339.8L126.9 342.8L125.0 347.3L126.7 350.9L129.2 349.2L128.4 347.8L130.6 344.0L137.5 339.4L147.1 343.0L150.2 346.2L153.7 344.1L155.3 345.1L156.7 346.7L155.8 351.0L160.8 353.6L160.4 360.4L179.5 360.5L185.4 354.1L192.3 352.8L203.3 346.9L209.6 349.1L216.2 355.0L219.9 353.5L219.8 349.0L222.5 345.3L228.3 350.8L230.3 347.9L231.1 351.4L233.7 350.9L235.1 349.0L234.3 340.9L236.1 340.5L236.7 343.0L238.0 342.7L238.1 338.5L239.8 337.9L239.9 328.8L239.3 318.2L235.9 312.5L236.5 310.7L237.8 311.9L239.1 310.4L234.5 304.3L232.9 297.6L224.1 294.2L223.1 300.3L216.9 300.6L217.2 305.0L211.2 301.5L210.6 305.3L209.0 302.5L207.2 304.0L204.0 302.8L202.7 300.0L203.7 297.6L201.9 295.3L200.1 295.7L201.7 294.3L198.6 293.8L195.8 290.2L190.6 292.7L186.5 290.4L184.2 291.4L179.4 287.5L171.5 286.7L171.3 284.8L168.6 285.1L164.8 281.0L156.3 279.3L150.8 274.3L147.2 266.2L150.1 263.0L149.3 258.6L151.0 256.9L148.3 255.4L147.7 251.0L151.3 248.3L152.4 243.7L149.9 243.2L148.8 241.0L152.0 240.5Z",c:[129.3,295.4],s:170.6},
  "陕西":{d:"M358.1 269.8L356.4 266.3L359.7 256.5L356.5 238.9L360.1 231.8L356.9 223.8L360.5 219.4L360.9 213.7L363.2 209.3L361.3 208.1L361.9 205.7L358.0 209.9L352.6 207.9L353.4 210.1L350.4 210.4L350.6 212.5L342.7 221.4L341.7 224.4L343.1 226.7L341.8 228.0L340.4 226.5L340.4 231.1L334.2 232.1L329.7 228.9L326.1 232.5L326.3 241.4L339.8 247.8L340.3 252.4L338.5 254.4L339.9 261.3L331.2 261.8L330.3 262.6L332.5 265.7L329.1 267.0L319.1 264.9L319.5 268.9L316.9 271.4L321.1 274.0L320.4 275.7L319.1 275.1L318.0 280.0L319.8 284.2L313.6 283.8L310.9 286.8L313.5 289.0L313.1 291.7L308.7 293.3L309.8 295.5L314.4 293.3L318.4 296.5L325.0 295.2L327.2 299.0L328.9 297.4L334.7 302.1L339.8 300.3L348.6 307.1L351.8 306.8L350.5 299.5L351.7 295.7L357.7 294.9L356.5 292.4L353.2 292.0L353.2 289.6L349.4 288.7L350.2 287.6L358.7 288.1L360.7 286.8L362.5 288.7L365.7 285.6L365.3 282.4L360.8 278.7L361.1 275.2L359.0 274.3L358.1 269.8Z",c:[342.7,262.0],s:79.2},
  "甘肃":{d:"M318.6 256.6L317.3 263.0L315.4 260.5L312.6 260.8L314.1 259.7L312.1 259.8L311.2 256.8L307.4 256.0L307.0 252.9L308.7 251.5L305.2 240.6L301.4 237.4L300.0 238.0L300.4 235.3L295.6 235.3L288.1 229.4L287.8 226.5L289.4 225.7L288.3 222.5L295.9 215.1L294.9 209.6L287.8 210.6L284.5 213.5L279.3 211.4L273.3 213.4L275.5 216.0L272.6 218.8L268.3 217.2L267.5 214.1L264.9 214.9L264.0 209.0L260.7 208.9L258.5 205.2L251.0 202.2L258.1 197.6L259.0 192.0L257.5 189.5L249.2 189.7L248.4 192.0L247.4 190.5L245.5 192.7L244.4 190.5L241.2 192.9L241.4 188.4L235.3 181.3L237.5 178.7L232.5 163.8L222.6 165.4L221.2 167.4L222.8 170.4L222.0 173.3L214.0 177.9L212.7 175.1L206.9 177.9L201.5 182.4L198.5 187.8L190.6 188.1L186.3 201.1L183.0 204.3L183.3 206.9L190.3 205.9L190.5 209.2L195.7 209.8L196.9 212.6L201.6 212.6L202.9 218.0L206.9 217.4L211.4 219.6L213.9 218.5L219.0 222.2L220.3 220.6L223.0 221.5L224.6 216.7L227.1 217.1L226.9 209.4L230.5 210.0L237.3 215.4L239.3 212.5L242.1 213.9L244.4 212.1L256.4 223.7L256.0 220.0L259.4 223.3L264.0 224.7L263.7 226.8L266.6 229.0L270.5 229.4L272.5 231.7L274.3 230.9L275.3 234.0L280.4 239.0L278.5 240.6L284.4 250.4L282.5 252.1L283.0 255.3L280.8 255.4L281.3 259.1L278.6 258.3L276.4 260.3L277.4 263.5L272.4 267.3L272.5 270.9L275.7 274.0L272.5 277.0L270.1 277.3L262.4 273.2L260.4 275.7L264.2 280.1L264.2 282.5L268.5 282.5L268.8 284.7L271.6 283.8L271.2 289.8L277.5 285.6L274.3 278.9L279.6 277.6L282.3 274.7L285.0 277.7L284.8 281.2L295.1 284.0L295.5 286.5L297.6 287.5L296.4 287.8L297.6 291.5L296.1 292.9L298.0 294.9L304.7 296.9L308.2 295.1L307.9 292.7L312.5 292.4L313.5 289.0L310.9 286.8L312.9 284.5L319.8 284.2L318.0 280.0L319.1 275.1L320.4 275.7L321.1 274.0L316.9 271.4L319.5 268.9L319.1 264.9L329.1 267.0L332.5 265.7L330.3 262.6L331.2 261.8L339.9 261.3L338.5 254.4L340.3 252.4L339.4 247.2L326.3 241.4L325.0 238.5L319.3 238.8L319.8 244.0L317.1 246.2L318.5 249.8L323.1 252.0L322.5 256.2L318.6 256.6Z",c:[291.9,252.5],s:145.2},
  "青海":{d:"M282.0 248.4L279.9 244.0L281.1 243.3L278.5 240.6L280.0 238.0L275.3 234.0L274.3 230.9L272.5 231.7L270.5 229.4L266.6 229.0L263.7 226.8L264.0 224.7L259.4 223.3L256.0 220.0L256.4 223.7L244.4 212.1L242.1 213.9L239.3 212.5L237.3 215.4L230.5 210.0L226.9 209.4L227.1 217.1L224.6 216.7L223.0 221.5L220.3 220.6L219.0 222.2L213.9 218.5L211.4 219.6L206.9 217.4L202.9 218.0L201.6 212.6L196.9 212.6L195.7 209.8L190.5 209.2L190.3 205.9L184.7 206.1L160.5 210.9L161.6 214.2L164.2 213.5L163.0 221.0L167.9 224.9L169.3 231.1L163.4 232.7L163.0 235.8L165.8 236.9L165.5 242.5L163.1 243.1L155.2 238.6L154.2 241.1L149.0 240.6L148.8 242.2L152.4 243.7L151.3 248.3L147.7 251.0L148.3 255.4L151.0 256.9L149.3 258.6L150.1 263.0L147.2 266.2L150.8 274.3L156.3 279.3L164.8 281.0L168.6 285.1L171.3 284.8L171.5 286.7L179.4 287.5L184.2 291.4L186.5 290.4L190.6 292.7L195.8 290.2L198.6 293.8L201.7 294.3L200.1 295.7L201.9 295.3L203.7 297.6L202.7 300.0L204.0 302.8L207.2 304.0L209.0 302.5L211.1 305.4L211.9 301.3L217.2 305.0L216.9 300.6L223.1 300.3L223.2 297.5L224.6 297.3L223.8 294.4L227.9 294.9L224.3 289.9L229.0 283.7L225.7 281.0L225.5 277.9L228.2 277.1L230.3 273.6L236.2 275.6L239.2 286.1L244.2 291.5L248.7 293.6L250.6 289.7L253.7 295.5L255.8 293.7L258.2 296.7L258.8 294.8L263.6 295.2L263.6 288.1L267.3 288.1L268.8 289.8L270.4 284.3L268.8 284.7L267.7 282.1L264.2 282.5L264.2 280.1L260.4 275.7L261.0 274.0L264.8 273.9L270.2 277.3L275.7 274.0L272.5 270.9L272.4 267.3L277.4 263.5L276.4 260.3L278.6 258.3L281.6 258.7L280.4 256.0L283.0 255.3L282.5 252.1L284.4 250.4L282.0 248.4Z",c:[214.1,252.8],s:118.3},
  "宁夏":{d:"M325.9 239.0L326.1 232.5L329.4 229.4L324.8 225.6L317.9 223.6L322.5 214.5L320.6 210.1L318.9 210.1L315.8 211.6L312.9 216.1L311.0 230.3L296.6 235.1L300.4 235.3L300.0 238.0L302.2 237.9L306.9 243.1L305.8 245.3L308.7 251.5L307.0 252.9L307.4 256.0L311.2 256.8L312.1 259.8L314.4 259.6L317.3 263.0L318.7 261.4L317.9 257.2L322.8 255.6L322.8 251.4L318.5 249.8L317.1 245.9L319.8 244.0L319.3 238.8L325.9 239.0Z",c:[315.0,236.8],s:42.9},
  "新疆":{d:"M225.3 164.1L221.3 156.7L219.0 147.2L217.3 146.8L218.4 143.4L212.3 142.3L202.5 133.2L179.9 127.5L178.8 122.3L182.7 117.3L182.1 113.5L184.1 108.6L180.8 102.0L180.1 96.3L177.9 93.0L175.3 93.2L174.1 90.4L169.9 90.4L166.6 87.4L166.1 84.5L161.9 81.6L163.2 80.0L160.7 77.5L162.3 76.6L162.0 74.1L154.2 73.2L150.4 80.0L143.6 80.2L141.4 82.7L140.1 93.9L138.3 96.5L136.0 95.9L132.8 97.9L131.5 95.8L124.5 94.8L117.6 90.1L106.8 108.2L108.6 111.2L108.1 113.9L102.7 112.3L102.0 110.2L84.3 112.0L87.9 116.5L86.2 122.7L86.9 135.2L82.7 136.1L84.2 138.3L81.0 138.3L77.5 147.9L57.7 151.2L53.0 154.6L45.0 152.3L37.6 159.2L37.5 157.9L31.7 158.3L32.2 153.3L28.2 154.9L24.9 152.9L24.8 155.3L14.8 156.5L13.3 161.6L8.4 162.9L9.9 168.4L8.1 169.9L8.0 173.2L9.6 174.8L11.5 173.4L13.9 174.5L17.3 177.8L15.5 181.5L15.9 186.9L14.4 187.9L15.9 191.7L12.9 193.2L9.2 192.0L8.5 194.0L16.6 198.1L16.2 201.1L19.9 202.9L20.0 208.9L18.4 210.4L19.5 214.1L23.7 214.0L24.7 217.9L28.4 220.7L37.4 223.6L35.3 226.5L35.8 234.7L42.3 240.3L42.5 239.2L50.2 240.5L54.3 234.2L58.0 232.8L57.4 231.5L59.5 230.0L71.1 235.7L74.7 235.4L80.1 231.5L84.8 233.2L85.6 236.9L95.7 239.6L105.5 236.6L110.7 238.9L115.5 237.4L117.5 234.0L119.7 233.4L140.6 233.6L143.1 236.5L144.8 235.8L152.5 240.8L154.2 241.1L155.2 238.6L163.8 243.1L165.9 242.2L165.8 236.9L163.0 235.8L163.4 232.7L169.3 231.1L169.3 229.2L167.9 224.9L163.0 221.0L164.2 213.5L161.6 214.2L160.5 210.9L183.3 207.2L183.0 204.3L186.3 201.1L190.6 188.1L198.5 187.8L201.5 182.4L206.9 177.9L212.7 175.1L214.0 177.9L221.4 173.9L222.8 170.4L221.2 167.4L225.3 164.1Z",c:[122.0,166.7],s:193.6},
  "台湾":{d:"M483.5 411.0L487.5 416.8L489.3 417.1L489.9 407.3L493.4 400.6L493.9 388.3L495.7 382.5L494.6 378.8L496.1 376.5L490.7 373.5L485.0 377.9L477.2 396.1L477.4 404.0L483.5 411.0Z",c:[487.0,393.9],s:31.3}
  };
function buildTracePage(){
  if(subBuilt.trace) return;
  subBuilt.trace=1;
  document.getElementById('traceChain').innerHTML=[
    ['#8F42','SC-1116-021 上链','10:21:36'],['#8F41','冷链温控同步','10:18:02'],['#8F40','SC-1115-042 赋码','10:12:44'],
    ['#8F3F','质量检验存证','10:05:18'],['#8F3E','供应链流转','09:58:20']
  ].map(function(x){
    return '<div class="chain-row"><span class="blk">'+x[0]+'</span><span class="tx">'+x[1]+'</span><span class="tm">'+x[2]+'</span></div>';
  }).join('');
  document.getElementById('traceCodeRing').innerHTML=donutMulti([
    {pct:62,color:'#38D6FF',name:'已激活'},{pct:21,color:'#2bd46e',name:'未激活'},
    {pct:11,color:'#F2B33D',name:'已过期'},{pct:6,color:'#E5564B',name:'已作废'}],92,9);
  document.getElementById('traceTop5').innerHTML=PROV_RANK.slice(0,5).map(function(x){
    return '<div class="t5row"><i></i><span>'+x[0]+'</span><b>'+fmtNum(x[1])+'</b></div>';
  }).join('');
  var tr=document.getElementById('traceTrendChart');
  if(tr) lineChart(tr,{labels:['11-10','11-11','11-12','11-13','11-14','11-15','11-16'],
    series:[{color:'#38D6FF',data:[9860,10420,9720,11240,10880,12160,12860],min:8000,max:14000}],padL:34});
  renderTraceMap();
  renderSankey();
}
function renderTraceMap(){
  var host=document.getElementById('traceMap');if(!host) return;
  if(typeof CN_MAP==='undefined'){host.insertAdjacentHTML('afterbegin','<div style="padding:20px;font-size:12px;color:#8AA0BE">地图数据加载中…</div>');return;}
  var max=2860,s='<svg viewBox="0 0 560 400" preserveAspectRatio="xMidYMid meet">';
  s+='<defs><filter id="tglow"><feGaussianBlur stdDeviation="6"/></filter></defs>';
  Object.keys(CN_MAP).forEach(function(n){
    var p=CN_MAP[n],v=0;
    for(var i=0;i<PROV_RANK.length;i++) if(PROV_RANK[i][0]===n) v=PROV_RANK[i][1];
    var t=v/max;
    s+='<path d="'+p.d+'" fill="'+(v?heatColor(0.2+t*0.62):'rgba(20,42,64,.55)')+'" stroke="rgba(120,200,235,'+(v?0.6:0.22)+')" stroke-width=".7" data-tip="'+n+(v?' · '+fmtNum(v)+' 次扫码':' · 暂无扫码')+'"/>';
  });
  PROV_RANK.forEach(function(x){
    var p=CN_MAP[x[0]];if(!p) return;
    var r=3+Math.sqrt(x[1])/9;
    s+='<circle cx="'+p.c[0]+'" cy="'+p.c[1]+'" r="'+(r*2.4)+'" fill="#F2B33D" opacity=".22" filter="url(#tglow)"><animate attributeName="r" values="'+(r*2)+';'+(r*3.1)+';'+(r*2)+'" dur="3s" repeatCount="indefinite"/></circle>';
    s+='<circle cx="'+p.c[0]+'" cy="'+p.c[1]+'" r="'+r+'" fill="#F2B33D" opacity=".9" data-tip="'+x[0]+' · '+fmtNum(x[1])+' 次"/></circle>';
    if(x[1]>=960) s+='<text x="'+(p.c[0]+r+3)+'" y="'+(p.c[1]+3)+'" font-size="8.5" fill="#FFE2A8">'+x[0]+'</text>';
  });
  s+='</svg>';
  host.insertAdjacentHTML('afterbegin',s);
}
function renderSankey(){
  var host=document.getElementById('traceSankey');if(!host) return;
  var W=330,H=440;
  var rows=[
    {y:44,name:'基地',segs:[['1号出菇房',4200],['2号出菇房',3400],['12号出菇房',2600]]},
    {y:128,name:'分选加工',segs:[['鲜品',6100],['干品',2400],['次级品',1700]]},
    {y:212,name:'冷链仓储',segs:[['华东仓',4600],['华南仓',3200],['华北仓',2400]]},
    {y:296,name:'物流配送',segs:[['直营',5200],['商超',3600],['电商',1400]]},
    {y:380,name:'终端消费',segs:[['门店',4800],['家庭',4000],['餐饮',1400]]}
  ];
  var colors=['#38D6FF','#2E8FE8','#F2B33D'];
  var x0=52,bw=246,bh=16;
  var s='<svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="xMidYMid meet">';
  rows.forEach(function(r){
    var tot=r.segs.reduce(function(a,b){return a+b[1];},0),acc=0;
    s+='<text x="4" y="'+(r.y-7)+'" font-size="9" fill="#8AA0BE">'+r.name+'</text>';
    r.segs.forEach(function(sg,k){
      var w=bw*sg[1]/tot;
      s+='<rect x="'+(x0+acc)+'" y="'+r.y+'" width="'+Math.max(2,w-2)+'" height="'+bh+'" rx="2" fill="'+colors[k]+'" opacity=".82"/>';
      s+='<text x="'+(x0+acc+4)+'" y="'+(r.y+11)+'" font-size="8" fill="rgba(4,16,28,.85)" font-family="DIN Alternate,Segoe UI">'+Math.round(sg[1]/100)/10+'k</text>';
      acc+=w;
    });
  });
  for(var i=0;i<rows.length-1;i++){
    var a=rows[i],b=rows[i+1];
    var ta=a.segs.reduce(function(x,y){return x+y[1];},0),tb=b.segs.reduce(function(x,y){return x+y[1];},0);
    var ca=0,cb=0;
    for(var k=0;k<3;k++){
      var wa=bw*a.segs[k][1]/ta,wb=bw*b.segs[k][1]/tb;
      var xa=x0+ca,xb=x0+cb,y1=a.y+bh,y2=b.y;
      s+='<path d="M'+xa.toFixed(1)+' '+y1+' C'+xa.toFixed(1)+' '+(y1+22)+' '+xb.toFixed(1)+' '+(y2-22)+' '+xb.toFixed(1)+' '+y2+
        ' L'+(xb+wb).toFixed(1)+' '+y2+' C'+(xb+wb).toFixed(1)+' '+(y2-22)+' '+(xa+wa).toFixed(1)+' '+(y1+22)+' '+(xa+wa).toFixed(1)+' '+y1+' Z" fill="'+colors[k]+'" opacity=".12"/>';
      ca+=wa;cb+=wb;
    }
  }
  s+='</svg>';
  host.innerHTML=s;
}

/* 实时心跳：视频时间戳逐秒跳动 + 关键指标刷新高亮 */
function startLiveFeed(){
  setInterval(function(){
    if(state.view!=='video') return;
    var d=new Date();
    var hh=('0'+d.getHours()).slice(-2),mm=('0'+d.getMinutes()).slice(-2),ss=('0'+d.getSeconds()).slice(-2);
    var els=document.querySelectorAll('#vgrid9 .vtile .vtime');
    for(var i=0;i<els.length;i++){
      els[i].innerHTML='<i class="rec"></i>2026-11-16 '+hh+':'+mm+':'+ss;
    }
  },1000);
  setInterval(function(){
    var els=document.querySelectorAll('#kCo2,#kTemp,#kHum,.es-row b,.envview .bigkpi b,.energyview .bigkpi b,.traceview .bigkpi b');
    for(var i=0;i<els.length;i++){
      els[i].classList.remove('bump');
      void els[i].offsetWidth;
      els[i].classList.add('bump');
    }
    setTimeout(function(){
      for(var j=0;j<els.length;j++) els[j].classList.remove('bump');
    },900);
  },4500);
}
startLiveFeed();

/* 初始化：URL 参数定位视图 */
(function init(){
  var p=new URLSearchParams(location.search);
  var v=p.get('view')||'overview';
  var house=p.get('house')||'';
  if(p.get('mode')==='overhead'){
    ENV_MODE='overhead';
    Array.prototype.forEach.call(document.querySelectorAll('#viewToggle button'),function(b){
      b.classList.toggle('on',b.dataset.emode==='overhead');
    });
  }
  if(house&&v==='env') house=decodeURIComponent(house);
  applyView(v,{house:house,code:p.get('code')||''});
  requestAnimationFrame(function(){
    buildCharts();
    lineChart(document.getElementById('miniChart'),{
      labels:LAB24,
      padL:34,
      hideY:false,
      series:[
        {data:[168,182,196,214,268,342,398,376,352,340,336,328,324],min:120,max:460,color:'#38D6FF',type:'area',width:1.6,dot:true}
      ]
    });
  });
})();
