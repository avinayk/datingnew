// commentClient.js
const ws = new WebSocket("ws://localhost:5000"); // Replace with your server address

ws.onopen = () => {
  console.log("Connected to WebSocket server");
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle incoming comments data
  if (data.message === "Event posts and comments retrieved successfully") {
    // Update the UI with the new comments
    updateCommentsUI(data.results);
  }
};

// Function to send comment
function sendComment(postId, userId, eventId, comment) {
  const commentData = { postId, userId, eventId, comment };
  ws.send(JSON.stringify(commentData));
}

// Example usage:
sendComment(1, 123, 456, "This is a new comment!");

// Function to update the comments section in the UI
function updateCommentsUI(comments) {
  const commentsContainer = document.getElementById("comments-container"); // Adjust based on your HTML structure
  commentsContainer.innerHTML = ""; // Clear the existing comments

  comments.forEach((comment) => {
    const commentElement = document.createElement("div");
    commentElement.className = "comment"; // You can style this class in CSS
    commentElement.innerHTML = `
      <p><strong>${comment.comment_user_username}</strong>: ${
      comment.description
    }</p>
      <p><small>${new Date(comment.comment_date).toLocaleString()}</small></p>
    `;
    commentsContainer.appendChild(commentElement); // Append the new comment to the container
  });
}
