import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { renderToStaticMarkup } from "react-dom/server";
import WewLoader from '@/components/WewLoader.jsx';

export default function OutputChat() {
  const [items, setItems] = useState([]);
  const [visible, setVisible] = useState(false);
const [text, setText] = useState("");
const [loader, setLoader] = useState(false);

useEffect(() => {
  setLoader(false);
}, [items]);

const handleSend = () => {

  setLoader(true);

console.log("ATTEMPTING TO SEND FORM TEXT from component",text,items);
  window.dispatchEvent(
    new CustomEvent("outputChatSubmit", {
      detail: {
        text,
        items,
      },
    })
  );

setText("");      // Clear the textarea
  //setVisible(false); // Optional: close the chat
};

  useEffect(() => {
    const handleShow = (event) => {
      setItems(event.detail || []);
      setVisible(true);
    };

    const handleClose = () => {
      setVisible(false);
      setItems([]);
    };

    window.addEventListener("showOutputChat", handleShow);
    window.addEventListener("closeOutputChat", handleClose);

    return () => {
      window.removeEventListener("showOutputChat", handleShow);
      window.removeEventListener("closeOutputChat", handleClose);
    };
  }, []);

  const handleInputChange = (index, key, value) => {
    const updatedItems = [...items];
    updatedItems[index] = { ...updatedItems[index], [key]: value };
    setItems(updatedItems);
  };



  if (!visible) return null;

  return (
    <div
    className='outputChat'
      onClick={() => window.dispatchEvent(new Event("closeOutputChat"))}
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "720px",
          background: "#111827",
          borderRadius: "12px",
          overflow: "auto",
          position: "relative",
          
          paddingTop: '2rem',
        }}
      >
      <div className='header'>AI Chat by Nyno</div>

        <div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    boxSizing: "border-box",
    height: "calc(100dvh - 240px)",
    overflowY: "scroll",
    width: "100%",
    padding: "24px",
    justifyContent: loader ? "center" : "flex-start",
    alignItems: loader ? "center" : "stretch",
  }}
>
  {loader ? (
    <WewLoader />
  ) : (
    <>
      {items.map((item, index) => (
        <div
          key={index}
          className={`message ${item.role}`}
        >
          <div
            className="content"
            dangerouslySetInnerHTML={{
              __html: renderToStaticMarkup(
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {item.content}
                </ReactMarkdown>
              ),
            }}
          />
        </div>
      ))}

      {items.length === 0 && (
        <div
          style={{
            color: "#6b7280",
            textAlign: "center",
            padding: "20px",
          }}
        >
          No items yet. Click "Add Item" to start.
        </div>
      )}
    </>
  )}
</div>
   
   
     <div className="formOutputChat">

<textarea
rows='1'
placeholder='Ask anything'
className='chatInput'
  value={text}
  onChange={(e) => setText(e.target.value)}
/>

<button className='submitBtn' onClick={handleSend}>
  ➤
</button>


     </div>

     
   
      </div>

   

    </div>
  );
}
