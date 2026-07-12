export function saveToFile(strData, type="application/x-yaml") {
	const blob = new Blob([strData], { type });
	const a = document.createElement("a");
	a.href = URL.createObjectURL(blob);
	a.download = "flow.nyno";
	a.click();
}
