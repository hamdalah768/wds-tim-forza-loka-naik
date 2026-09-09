(() => {
  'use strict';
  const L=window.Loka;
  document.querySelectorAll('[data-quiz]').forEach(root=>{
    const lesson=L.data.lessons.find(l=>l.slug===root.dataset.quiz);if(!lesson)return;
    root.innerHTML=`<form><fieldset><legend>Cek pemahaman · ${L.esc(lesson.question)}</legend>${lesson.answers.map((answer,i)=>`<label class="quiz-option"><input type="radio" name="answer-${L.esc(lesson.slug)}" value="${i}" required><span>${L.esc(answer)}</span></label>`).join('')}</fieldset><button type="submit">Periksa jawaban</button><p class="quiz-feedback" role="status" aria-live="polite"></p></form>`;
    root.querySelector('form').addEventListener('submit',async e=>{
      e.preventDefault();const button=root.querySelector('button'),message=root.querySelector('.quiz-feedback');
      const checked=root.querySelector('input:checked');if(!checked)return;
      await L.busy(button,async()=>{
        let correct=Number(checked.value)===lesson.correct,explanation=lesson.explanation,saved=false;
        try{
          if(L.fullstack){await L.sessionReady;const r=await L.request('/api/quiz',{method:'POST',body:{lesson:lesson.slug,answer:Number(checked.value)}});({correct,explanation,saved}=r);}
          message.dataset.result=correct?'correct':'incorrect';
          message.textContent=(correct?'Tepat. ':'Belum tepat. ')+explanation+(saved?' Hasil tersimpan di akun.':'');
          document.dispatchEvent(new Event('loka:progresssaved'));
        }catch(e){message.dataset.result='incorrect';message.textContent='Hasil belum tersimpan. '+e.message;}
      });
    });
  });
})();
