import React, { useState, useRef, useEffect } from "react";
import jsyaml from "js-yaml";

export function YamlFormToggle({ value, onChange }) {
  const [isFormView, setIsFormView] = useState(false);
  const formContainerRef = useRef(null);
  const [dataForForm, setDataForForm] = useState(null); // store parsed YAML

  const generateForm = (container, data) => {
    if (!container) return; // safety check
    container.innerHTML = "";
    const recurse = (obj, parent, path = []) => {
      Object.keys(obj).forEach((key) => {
        const val = obj[key];
        const fullPath = [...path, key];
	const inputStyle = 'background: none; margin-left: 9px; border-width: 1px; border-style: none none solid; border-color: currentcolor currentcolor white; border-image: none; color: white;/*! padding-top: 20ox; */display: block;margin: 1rem 0.5rem;padding-bottom: 9px;box-shadow: none;outline: linen;';

        if (val && typeof val === "object" && !Array.isArray(val)) {
          const fs = document.createElement("fieldset");
		fs.style='margin-bottom: 1rem;';
          const legend = document.createElement("legend");
          legend.textContent = key;
          fs.appendChild(legend);
          recurse(val, fs, fullPath);
          parent.appendChild(fs);
        } else if (Array.isArray(val)) {
          val.forEach((item, idx) => {
            const group = document.createElement("div");
            group.className = "form-group";
            const label = document.createElement("label");
            label.textContent = fullPath[fullPath.length - 1] + `[${idx}]`;
            const input = document.createElement("input");
		  input.style = inputStyle;
            input.value = item;
            input.dataset.path = JSON.stringify([...fullPath, idx]);
            group.appendChild(label);
            group.appendChild(input);
            parent.appendChild(group);
          });
        } else {
          const group = document.createElement("div");
          group.className = "form-group";
          const label = document.createElement("label");
          label.textContent = fullPath[fullPath.length - 1]; //.join(".");
          const input = document.createElement("input");
		  input.style = inputStyle;
          input.value = val || "";
          input.dataset.path = JSON.stringify(fullPath);
          group.appendChild(label);
          group.appendChild(input);
          parent.appendChild(group);
        }
      });
    };
    recurse(data, container);
  };

  const readForm = (container) => {
    const result = {};
    if (!container) return result;
    container.querySelectorAll("input").forEach((input) => {
      const path = JSON.parse(input.dataset.path);
      let obj = result;
      for (let i = 0; i < path.length; i++) {
        const p = path[i];
        if (i === path.length - 1) {
          obj[p] = input.value;
        } else {
          if (obj[p] === undefined) obj[p] = typeof path[i + 1] === "number" ? [] : {};
          obj = obj[p];
        }
      }
    });
    return result;
  };

  const toggleView = () => {
    if (!isFormView) {
      try {
        const data = jsyaml.load(value || "{}");
        setDataForForm(data); // store parsed YAML
        setIsFormView(true);  // show form first
      } catch (e) {
        alert("Invalid YAML: " + e.message);
      }
    } else {
      const data = readForm(formContainerRef.current);
      onChange(jsyaml.dump(data));
      setIsFormView(false);
    }
  };

  // Populate form once ref exists and data is ready
  useEffect(() => {
    if (isFormView && formContainerRef.current && dataForForm) {
      generateForm(formContainerRef.current, dataForForm);
    }
  }, [isFormView, dataForForm]);

  return (
    <div>
      <button onClick={toggleView} style={{ marginBottom: 6 }}>
        {isFormView ? "Back to YAML" : "Edit as Form"}
      </button>
      {!isFormView ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: "100%", height: 120 }}
        />
      ) : (
        <div ref={formContainerRef} />
      )}
    </div>
  );
}

