console.log("script.js loaded");
const apiKey = "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"; // Warning: Never expose API keys publicly!

async function sendMessage() {
  const input = document.getElementById("user-input");
  const message = input.value;
  input.value = "";

  if (!message) return;

  appendMessage("You", message);

  // console.log("Sending API request...");
  // const response = await fetch("https://api.deepseek.com/v1/chat/completions", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //     "Authorization": `Bearer ${apiKey}`
  //   },
  //   body: JSON.stringify({
  //     model: "deepseek/deepseek-r1:free",
  //     messages: [
  //       { role: "system", content: "You are a helpful assistant." },
  //       { role: "user", content: message }
  //     ]
  //   })
  // }).catch(error => {
  //   console.error("Fetch Error:", error.message);
  //   console.error("Fetch Error Stack:", error.stack);
  // });

  // console.log("Response.ok:", response.ok);
  // if (!response.ok) {
  //   console.error("API Error:", response.status, response.statusText);
  //   return;
  // }

  // let data;
  // try {
  // console.log("Response is OK, attempting to parse JSON...");
  //   data = await response.json();
  // console.log("Data:", data);
  //   console.log(data);
  // } catch (error) {
  //   console.error("JSON Error:", error);
  //   return;
  // }
  // const reply = data.choices[0].message.content;
  // console.log("Reply:", reply);
  // appendMessage("AI", reply);
  appendMessage("AI", "API functionality is currently disabled due to persistent authentication issues. Please check your API key and DeepSeek API settings.");
}

function appendMessage(sender, text) {
  const chatBox = document.getElementById("chat-box");
  const messageDiv = document.createElement("div");
  messageDiv.innerHTML = `<strong>${sender}:</strong> ${text}`;
  chatBox.appendChild(messageDiv);
  chatBox.scrollTop = chatBox.scrollHeight;
}
