import {useEffect,useState} from "react";

export default function WewLoader({color1="cyan",color2="dodgerblue",done=false}) {
const [showDone,setShowDone]=useState(done);

useEffect(()=>{
setShowDone(done);
},[done]);

return (
<div className="wew_wrap">
<style>{`
.wew_wrap{
display:flex;
justify-content:center;
align-items:center;
}
.wew_wrap .loader{
display:flex;
gap:10px;
}
.wew_wrap .dot{
width:42px;
height:42px;
border-radius:50%;
opacity:0;
transform:scale(0.6);
animation:appear 1.2s infinite ease-in-out;
}
.wew_wrap .dot:nth-child(1),
.wew_wrap .dot:nth-child(2){
background:${color1};
}
.wew_wrap .dot:nth-child(3),
.wew_wrap .dot:nth-child(4){
background:${color2};
}
.wew_wrap .dot:nth-child(1){animation-delay:0s;}
.wew_wrap .dot:nth-child(2){animation-delay:0.1s;}
.wew_wrap .dot:nth-child(3){animation-delay:0.2s;}
.wew_wrap .dot:nth-child(4){animation-delay:0.3s;}
@keyframes appear{
0%{opacity:0;transform:scale(0.6);}
25%{opacity:1;transform:scale(1);}
70%{opacity:1;transform:scale(1);}
100%{opacity:0;transform:scale(0.6);}
}
.check{
font-size:42px;
opacity:0;
transform:scale(0.4);
animation:pop .35s ease-out forwards;
}
@keyframes pop{
0%{opacity:0;transform:scale(0.4);}
60%{opacity:1;transform:scale(1.2);}
100%{opacity:1;transform:scale(1);}
}
`}</style>

{!showDone ? (
<div className="loader">
<div className="dot"></div>
<div className="dot"></div>
<div className="dot"></div>
<div className="dot"></div>
</div>
) : (
<div className="check">✔️</div>
)}
</div>
);
}