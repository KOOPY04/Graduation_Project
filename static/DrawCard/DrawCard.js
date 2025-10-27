console.log("🟢 Tarot JS loaded");

const cardBackUrl = "/static/images/card_back.png";

// 自訂警示框
function showAlert(msg) {
    const modal = document.getElementById("customAlert");
    const msgBox = document.getElementById("customAlertMsg");
    const btn = document.getElementById("customAlertBtn");
    if (!modal || !msgBox || !btn) { alert(msg); return; }
    msgBox.textContent = msg;
    modal.style.display = "flex";
    btn.onclick = () => { modal.style.display = "none"; };
}

// 生成塔羅 HTML
function generateTarotHTML(slotTitles) {
    let html = "<div class='wrapper'><div class='fan-container' id='fanContainer'>";
    for(let i=0;i<40;i++){
        html += `<img src="${cardBackUrl}" class="card" data-index="${i}"/>`;
    }
    html += "</div></div>";

    html += `<div class='spread' data-count='${slotTitles.length}'>`;
    if(slotTitles.length===4){
        html += `<div class='slot slot-top' id='slot0'>${slotTitles[0]}</div><div class='slot-row'>`;
        slotTitles.slice(1).forEach((t,i)=>{ html+=`<div class='slot' id='slot${i+1}'>${t}</div>` });
        html += "</div>";
    } else {
        html += "<div class='slot-row'>";
        slotTitles.forEach((t,i)=>{ html+=`<div class='slot' id='slot${i}'>${t}</div>` });
        html += "</div>";
    }
    html += "</div>";
    return html;
}

// 初始化
function initTarotPage(){
    console.log("🟢 Tarot JS running");

    const count = parseInt(sessionStorage.getItem("count"),10)||4;
    const categoryId = sessionStorage.getItem("category_id");
    const categoryName = sessionStorage.getItem("category_name");
    const subquestionText = sessionStorage.getItem("subquestion_text");
    if(!categoryId||!subquestionText){ showAlert("缺少必要資料"); setTimeout(()=>{window.location.href="/select"},1500); return; }

    const slotTitles = count===3 ? ["過去","現在","未來"] : ["問題核心","障礙或短處","對策","資源或長處"];
    const container = document.getElementById("tarotContainer")||document.body;
    container.innerHTML = generateTarotHTML(slotTitles);

    // 按鈕
    const buttonRow = container.querySelector(".button-row") || (()=>{let b=document.createElement("div");b.className="button-row"; container.appendChild(b); return b;})();
    const interpretBtn = document.getElementById("interpretBtn")||(()=>{let b=document.createElement("button");b.id="interpretBtn"; b.className="interpret-button"; b.textContent="🔮 解牌"; buttonRow.appendChild(b); return b;})();
    const homeBtn = document.getElementById("homeBtn")||(()=>{let b=document.createElement("button");b.id="homeBtn"; b.className="interpret-button"; b.textContent="回上一頁"; buttonRow.appendChild(b); return b;})();
    homeBtn.onclick = ()=>{ sessionStorage.removeItem("selected_cards"); window.history.back(); };

    const fanContainer = document.getElementById("fanContainer");
    const cards = Array.from(fanContainer.querySelectorAll(".card"));
    let rotateY=0,isDragging=false,lastX=0,velocity=0,radius=600,scale=0.9;
    const selected=[];

    // 響應式半徑與縮放
    function updateResponsive(){
        const w=window.innerWidth;
        if(w>=1200){radius=600; scale=0.9;}
        else if(w>=768){radius=400; scale=0.85;}
        else if(w>=480){radius=300; scale=0.8;}
        else{radius=220; scale=0.75;}
    }
    updateResponsive();
    window.addEventListener("resize",()=>{updateResponsive(); positionCards();});

    // 提示
    const oldTip=document.getElementById("dragTip"); if(oldTip) oldTip.remove();
    const tip=document.createElement("div");
    tip.id="dragTip"; tip.textContent="← 拖曳 / 滑動左右旋轉牌陣 →"; fanContainer.parentNode.appendChild(tip);

    // 設定初始角度
    cards.forEach((c,i)=>c.dataset.angle=i*360/cards.length);

    // 更新卡牌位置
    function positionCards(){
        const tiltX=-15;
        let frontCard=null, minDiff=360;
        cards.forEach(c=>{
            let a=parseFloat(c.dataset.angle)%360; if(a<0) a+=360;
            if(!c.classList.contains("locked")){
                const diff=Math.min(a,360-a);
                if(diff<minDiff){minDiff=diff; frontCard=c;}
            }
        });
        cards.forEach(c=>{
            const a=parseFloat(c.dataset.angle)||0;
            if(c.classList.contains("locked")){
                c.style.transform=`rotateY(${a}deg) rotateX(${tiltX}deg) translateZ(${radius}px) scale(${scale})`;
                c.style.opacity=0.3; c.style.zIndex=0;
            } else if(c===frontCard){
                c.style.transform=`rotateY(${a}deg) rotateX(${tiltX}deg) translateZ(${radius}px) scale(${scale*1.3})`;
                c.style.opacity=1; c.style.zIndex=1000;
            } else{
                c.style.transform=`rotateY(${a}deg) rotateX(${tiltX}deg) translateZ(${radius}px) scale(${scale})`;
                c.style.opacity=1; c.style.zIndex=0;
            }
        });
    }
    positionCards();

    // hover
    cards.forEach(c=>{
        c.addEventListener("mouseenter",()=>{ if(c.classList.contains("locked")) return; c.style.transition="transform 0.3s, box-shadow 0.3s"; c.style.transform+=` scale(1.2)`; c.style.boxShadow="0 20px 40px rgba(0,0,0,0.5)"; });
        c.addEventListener("mouseleave",()=>{ if(c.classList.contains("locked")) return; c.style.transition="transform 0.3s, box-shadow 0.3s"; positionCards(); c.style.boxShadow="0 4px 12px rgba(0,0,0,0.25)"; });
    });

    // 拖動旋轉
    const dragStart=e=>{isDragging=true; lastX=e.clientX||e.touches[0].clientX;}
    const dragMove=e=>{
        if(!isDragging) return;
        const delta=(e.clientX||e.touches[0].clientX)-lastX;
        rotateY+=delta*0.5;
        lastX=e.clientX||e.touches[0].clientX;
        velocity=delta*0.5;
        cards.forEach((c,i)=>c.dataset.angle=(i*360/cards.length+rotateY)%360);
        positionCards();
    }
    const dragEnd=()=>{isDragging=false;}
    fanContainer.addEventListener('mousedown',dragStart);
    fanContainer.addEventListener('touchstart',dragStart);
    fanContainer.addEventListener('mousemove',dragMove);
    fanContainer.addEventListener('touchmove',dragMove);
    fanContainer.addEventListener('mouseup',dragEnd);
    fanContainer.addEventListener('mouseleave',dragEnd);
    fanContainer.addEventListener('touchend',dragEnd);

    // 慣性動畫
    function inertia(){if(!isDragging){velocity*=0.95; rotateY+=velocity; if(Math.abs(velocity)>0.1){cards.forEach((c,i)=>c.dataset.angle=(i*360/cards.length+rotateY)%360); positionCards();}} requestAnimationFrame(inertia);}
    inertia();

    // 點選卡牌放入 slot
    function placeCard(card, slot){
        const clone=card.cloneNode(true);
        clone.style.position="absolute";
        clone.style.top=0; clone.style.left=0;
        clone.style.width="100%"; clone.style.height="100%";
        clone.style.objectFit="cover";
        clone.style.pointerEvents="none";
        slot.innerHTML="";
        slot.appendChild(clone);
    }

    cards.forEach(c=>{
        c.addEventListener('click',()=>{
            if(selected.length>=count){showAlert(`已選滿 ${count} 張牌！`); return;}
            if(selected.includes(c.dataset.index)) return;
            const slot=document.getElementById("slot"+selected.length);
            if(slot) placeCard(c,slot);
            selected.push(c.dataset.index);
            c.classList.add("locked");
            c.style.transition="opacity 0.3s"; c.style.opacity=0.3;

            sessionStorage.setItem("selected_cards",JSON.stringify(selected));
            sessionStorage.setItem("count",count);
            sessionStorage.setItem("category_id",categoryId);
            sessionStorage.setItem("category_name",categoryName);
            sessionStorage.setItem("subquestion_text",subquestionText);

            positionCards();
        });
    });

    // 解牌按鈕
    interpretBtn.onclick=()=>{
        if(selected.length<count){showAlert(`請先選滿 ${count} 張牌再解牌！`); return;}
        window.location.href="/interpret";
    };
}

document.addEventListener("DOMContentLoaded",initTarotPage);
