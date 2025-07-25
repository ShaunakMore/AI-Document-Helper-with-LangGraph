# Drafter - AI-Powered Document Editor

Drafter is an intelligent document editing application that combines a Flask backend with a React frontend to provide an AI-powered writing assistant. Using Google's Gemini AI model and LangGraph, Drafter helps users create, edit, and manage documents through natural language conversations.

## ✨ Features

- **AI-Powered Writing Assistant**: Chat with an AI to create and edit documents
- **Real-time Document Updates**: See your document changes in real-time as you interact with the AI
- **Session Management**: Maintain separate document sessions with unique identifiers
- **Document Persistence**: Save your documents to local files
- **Tool Integration**: AI can use specialized tools to update and save documents
- **Responsive UI**: Modern, gradient-based interface with real-time chat
- **Quick Actions**: Pre-defined buttons for common tasks

## 🛠 Technology Stack

### Backend
- **Flask** - Web framework
- **LangChain** - AI framework for building applications with LLMs
- **LangGraph** - Graph-based workflow orchestration
- **Google Generative AI** - Gemini 2.0 Flash Lite model
- **Flask-CORS** - Cross-origin resource sharing support

### Frontend
- **React** - Frontend framework
- **Lucide React** - Icon library
- **Tailwind CSS** - Utility-first CSS framework
- **Modern JavaScript** - ES6+ features

## 📋 Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn
- Google AI API key

## 🚀 Installation & Setup

### Backend Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd drafter
   ```

2. **Create and activate virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install Python dependencies**
   ```bash
   pip install flask flask-cors python-dotenv langchain-google-genai langchain-core langgraph
   ```

4. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   GOOGLE_API_KEY=your_google_ai_api_key_here
   ```

5. **Run the backend server**
   ```bash
   python app.py
   ```
   The backend will start on `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory (if separate) or set up React**
   ```bash
   # If using Create React App
   npx create-react-app drafter-frontend
   cd drafter-frontend
   
   # Install additional dependencies
   npm install lucide-react
   ```

2. **Replace the default App.js with the provided React component**

3. **Start the development server**
   ```bash
   npm start
   ```
   The frontend will start on `http://localhost:3000`

## 🔧 Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# Required: Google AI API Key
GOOGLE_API_KEY=your_google_ai_api_key_here

# Optional: Flask configuration
FLASK_ENV=development
FLASK_DEBUG=True
```

### Getting Google AI API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your `.env` file

## 📡 API Endpoints

### Chat Endpoint
- **POST** `/api/chat`
  - Send messages to the AI assistant
  - Body: `{"message": "string", "session_id": "string"}`

### Document Management
- **GET** `/api/document/<session_id>`
  - Retrieve current document content for a session

### Session Management
- **POST** `/api/sessions`
  - Create a new session
- **POST** `/api/sessions/<session_id>/clear`
  - Clear a session's document content

### Health Check
- **GET** `/api/health`
  - Check server status and active sessions

### Testing
- **POST** `/api/test/update/<session_id>`
  - Manually update document content for testing

## 🎯 Usage

1. **Start the Application**
   - Run both backend and frontend servers
   - Open `http://localhost:3000` in your browser

2. **Begin Editing**
   - Type messages to the AI assistant
   - Use natural language to request document creation or editing
   - Example prompts:
     - "Write a short story about a robot"
     - "Create a to-do list for today"
     - "Add a paragraph about artificial intelligence"

3. **Save Documents**
   - Ask the AI to save your document: "Save this as 'my_document'"
   - Files are saved in the `saved_documents/` directory

4. **Quick Actions**
   - Use the pre-defined quick action buttons for common tasks
   - Click any button to send that prompt to the AI


## 🔍 Key Features Explained

### AI Tools
The AI assistant has access to two main tools:
- **update_document**: Updates the document with new content
- **save_document**: Saves the current document to a file

### Session Management
- Each user gets a unique session ID
- Sessions maintain separate document states
- Documents persist across the session lifecycle

### Real-time Updates
- Frontend polls for document updates every 2 seconds
- Immediate updates when AI tools are used
- Live character count and document preview

## 🐛 Troubleshooting

### Common Issues

1. **Backend not starting**
   - Check if all dependencies are installed
   - Verify Google API key is set in `.env`
   - Ensure port 5000 is available

2. **Frontend can't connect to backend**
   - Verify backend is running on port 5000
   - Check CORS configuration
   - Ensure API URLs match the backend address

3. **AI responses not working**
   - Verify Google API key is valid and has credits
   - Check console logs for error messages
   - Ensure internet connection is stable

4. **Documents not saving**
   - Check if `saved_documents/` directory exists
   - Verify write permissions
   - Check backend logs for errors

## 📞 Support

If you encounter any issues or have questions:
1. Check the troubleshooting section above
2. Review the console logs for error messages
3. Open an issue on GitHub with detailed information about the problem

---

**Happy Writing with Drafter! 🚀✍️**