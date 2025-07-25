from flask import Flask, request, jsonify
from flask_cors import CORS
from typing import Annotated, Sequence, TypedDict, Dict, Any, List
from dotenv import load_dotenv  
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, ToolMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool
from langgraph.graph.message import add_messages
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
import os
import uuid
import json

load_dotenv()

app = Flask(__name__)
CORS(app)

# Store sessions and their document content
sessions: Dict[str, Dict[str, Any]] = {}

class AgentState(TypedDict):
    messages: Annotated[Sequence[BaseMessage], add_messages]
    document_content: str

# Define tools with proper session handling
def create_tools(session_id: str):
    @tool
    def update_document(content: str) -> str:
        """Updates the document with the provided content.
        
        Args:
            content: The new content for the document
        """
        if session_id in sessions:
            sessions[session_id]["document_content"] = content
            print(f"Document updated for session {session_id}: {len(content)} characters")
            return f"✅ Document updated successfully! The document now contains {len(content)} characters."
        return "❌ Error: Could not update document - session not found."

    @tool
    def save_document(filename: str) -> str:
        """Save the current document to a text file.
        
        Args:
            filename: Name for the text file (without extension)
        """
        if session_id not in sessions:
            return "❌ Error: No active session to save."
        
        if not filename.endswith('.txt'):
            filename = f"{filename}.txt"
        
        document_content = sessions[session_id]["document_content"]
        
        if not document_content.strip():
            return "❌ Error: Cannot save an empty document. Please add some content first."
        
        try:
            # Create a 'saved_documents' directory if it doesn't exist
            os.makedirs('saved_documents', exist_ok=True)
            file_path = os.path.join('saved_documents', filename)
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(document_content)
            
            print(f"File saved successfully: {file_path}")
            return f"💾 Document saved successfully as '{filename}' in the saved_documents folder!"
        except Exception as e:
            print(f"Error saving file: {str(e)}")
            return f"❌ Error saving file: {str(e)}"
    
    return [update_document, save_document]

def create_agent_graph(session_id: str):
    """Create the LangGraph agent graph for a specific session"""
    
    # Create session-specific tools
    tools = create_tools(session_id)
    model = ChatGoogleGenerativeAI(model="gemini-2.0-flash-lite").bind_tools(tools)
    
    def call_model(state: AgentState):
        """Call the model with current state"""
        current_doc = sessions.get(session_id, {}).get("document_content", "")
        
        system_message = SystemMessage(content=f"""You are Drafter, a helpful AI writing assistant. You help users create, edit, and manage documents.

Current document content:
{current_doc if current_doc else "(empty document)"}

Instructions:
- When users ask you to write, create, or add content, use the 'update_document' tool with the complete new document content
- When users ask to save the document, use the 'save_document' tool with their specified filename
- If users want to modify existing content, combine the existing content with their requested changes
- If they want to append content, add it to the existing content
- Always be helpful and conversational
- After using tools, provide a friendly response about what you've done

Remember: Use update_document with the COMPLETE document content (existing + new), not just the new parts.""")
        
        # Prepare messages for the model
        messages = [system_message] + list(state["messages"])
        response = model.invoke(messages)
        
        return {"messages": [response], "document_content": current_doc}

    def should_continue(state: AgentState):
        """Check if we should continue to tools or end"""
        last_message = state["messages"][-1]
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "tools"
        return END

    # Build the graph
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("agent", call_model)
    workflow.add_node("tools", ToolNode(tools))
    
    # Set entry point
    workflow.set_entry_point("agent")
    
    # Add edges
    workflow.add_conditional_edges(
        "agent",
        should_continue,
        ["tools", END]
    )
    workflow.add_edge("tools", "agent")
    
    return workflow.compile()

@app.route('/api/chat', methods=['POST'])
def chat():
    try:
        data = request.get_json()
        message = data.get('message', '')
        session_id = data.get('session_id', str(uuid.uuid4()))
        
        print(f"Processing message for session {session_id}: {message}")
        
        # Initialize session if it doesn't exist
        if session_id not in sessions:
            sessions[session_id] = {
                "document_content": "",
                "messages": []
            }
        
        session = sessions[session_id]
        
        # Create user message
        user_message = HumanMessage(content=message)
        
        # Create agent graph for this session
        agent_graph = create_agent_graph(session_id)
        
        # Prepare initial state
        initial_state = {
            "messages": session["messages"] + [user_message],
            "document_content": session["document_content"]
        }
        
        print(f"Initial state - Document length: {len(session['document_content'])}")
        
        # Run the agent
        tools_used = []
        final_response = ""
        
        try:
            # Execute the graph
            result = agent_graph.invoke(initial_state)
            
            # Extract information from the result
            final_messages = result["messages"]
            
            # Find AI responses and tool usage
            ai_responses = []
            for msg in final_messages:
                if isinstance(msg, AIMessage):
                    if hasattr(msg, "tool_calls") and msg.tool_calls:
                        # Track tools used
                        for tool_call in msg.tool_calls:
                            tool_name = tool_call["name"]
                            if tool_name not in tools_used:
                                tools_used.append(tool_name)
                    
                    # Collect AI response content
                    if msg.content:
                        ai_responses.append(msg.content)
                
                elif isinstance(msg, ToolMessage):
                    # Tool execution result
                    ai_responses.append(msg.content)
            
            # Combine responses
            final_response = "\n".join(ai_responses) if ai_responses else "I'm ready to help with your document!"
            
            # Update session with all messages
            session["messages"] = initial_state["messages"] + final_messages
            
            # Get updated document content
            current_doc_content = sessions[session_id]["document_content"]
            
            print(f"Final state - Document length: {len(current_doc_content)}")
            print(f"Tools used: {tools_used}")
            
            return jsonify({
                "success": True,
                "response": final_response,
                "document_content": current_doc_content,
                "tools_used": tools_used,
                "session_id": session_id
            })
            
        except Exception as graph_error:
            print(f"Graph execution error: {str(graph_error)}")
            import traceback
            traceback.print_exc()
            
            # Fallback response
            return jsonify({
                "success": True,
                "response": f"I encountered an issue: {str(graph_error)}. Please try again.",
                "document_content": session["document_content"],
                "tools_used": [],
                "session_id": session_id
            })
        
    except Exception as e:
        print(f"Error in chat endpoint: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/document/<session_id>', methods=['GET'])
def get_document(session_id):
    """Get the current document content for a session"""
    try:
        if session_id in sessions:
            content = sessions[session_id]["document_content"]
            print(f"Fetching document for session {session_id}: {len(content)} characters")
            return jsonify({
                "success": True,
                "document_content": content
            })
        else:
            print(f"Session {session_id} not found, returning empty content")
            return jsonify({
                "success": True,
                "document_content": ""
            })
    except Exception as e:
        print(f"Error in get_document: {str(e)}")
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/sessions', methods=['POST'])
def create_session():
    """Create a new session"""
    try:
        session_id = str(uuid.uuid4())
        sessions[session_id] = {
            "document_content": "",
            "messages": []
        }
        return jsonify({
            "success": True,
            "session_id": session_id
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/sessions/<session_id>/clear', methods=['POST'])
def clear_session(session_id):
    """Clear a session's document content"""
    try:
        if session_id in sessions:
            sessions[session_id]["document_content"] = ""
            sessions[session_id]["messages"] = []
            return jsonify({
                "success": True,
                "message": "Session cleared successfully"
            })
        else:
            return jsonify({
                "success": False,
                "error": "Session not found"
            }), 404
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "success": True,
        "status": "healthy",
        "active_sessions": len(sessions),
        "sessions_info": {
            session_id: {
                "document_length": len(session_data["document_content"]),
                "message_count": len(session_data["messages"])
            }
            for session_id, session_data in sessions.items()
        }
    })

# Test endpoint to manually trigger document updates
@app.route('/api/test/update/<session_id>', methods=['POST'])
def test_update(session_id):
    """Test endpoint to manually update document content"""
    try:
        data = request.get_json()
        content = data.get('content', 'Test content')
        
        if session_id not in sessions:
            sessions[session_id] = {"document_content": "", "messages": []}
        
        sessions[session_id]["document_content"] = content
        
        return jsonify({
            "success": True,
            "message": f"Document updated with {len(content)} characters",
            "document_content": content
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

if __name__ == '__main__':
    print("🚀 Starting Drafter backend server...")
    print("📋 Available endpoints:")
    print("  - POST /api/chat - Send messages to the AI")
    print("  - GET /api/document/<session_id> - Get document content")
    print("  - GET /api/health - Health check")
    print("  - POST /api/test/update/<session_id> - Test document updates")
    print("💾 Documents will be saved to: ./saved_documents/")
    
    # Create saved_documents directory
    os.makedirs('saved_documents', exist_ok=True)
    
    app.run(debug=True, host='0.0.0.0', port=5000)