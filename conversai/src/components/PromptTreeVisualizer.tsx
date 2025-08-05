'use client';

import { useEffect, useState, useRef } from 'react';
import { PromptTreeNode } from '@/lib/services/memory/multiTierMemory';

interface PromptTreeVisualizerProps {
  tree: PromptTreeNode | null;
  onNodeSelect?: (node: PromptTreeNode) => void;
  isMinimized?: boolean;
}

export default function PromptTreeVisualizer({ 
  tree, 
  onNodeSelect,
  isMinimized = false 
}: PromptTreeVisualizerProps) {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!tree || isMinimized) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw tree
    drawTree(ctx, tree, canvas.width / 2, 50, canvas.width / 4);
  }, [tree, selectedNode, hoveredNode, isMinimized]);

  const drawTree = (
    ctx: CanvasRenderingContext2D, 
    node: PromptTreeNode, 
    x: number, 
    y: number, 
    spread: number
  ) => {
    // Draw connections first (behind nodes)
    node.children.forEach((child, index) => {
      const childX = x + (index - (node.children.length - 1) / 2) * spread;
      const childY = y + 80;
      
      // Draw connection line
      ctx.strokeStyle = 'rgba(255, 51, 51, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(childX, childY);
      ctx.stroke();
      
      // Draw probability on line
      const midX = (x + childX) / 2;
      const midY = (y + childY) / 2;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${(child.probability * 100).toFixed(0)}%`, midX, midY);
    });

    // Draw node
    const isHovered = hoveredNode === node.id;
    const isSelected = selectedNode === node.id;
    
    // Node background
    ctx.fillStyle = isSelected 
      ? 'rgba(255, 51, 51, 0.3)' 
      : isHovered 
        ? 'rgba(255, 51, 51, 0.2)' 
        : 'rgba(255, 255, 255, 0.05)';
    ctx.strokeStyle = isSelected
      ? 'rgba(255, 51, 51, 0.8)'
      : 'rgba(255, 51, 51, 0.3)';
    ctx.lineWidth = isSelected ? 2 : 1;
    
    // Draw rounded rectangle
    const width = 120;
    const height = 40;
    const radius = 8;
    
    ctx.beginPath();
    ctx.moveTo(x - width/2 + radius, y - height/2);
    ctx.lineTo(x + width/2 - radius, y - height/2);
    ctx.quadraticCurveTo(x + width/2, y - height/2, x + width/2, y - height/2 + radius);
    ctx.lineTo(x + width/2, y + height/2 - radius);
    ctx.quadraticCurveTo(x + width/2, y + height/2, x + width/2 - radius, y + height/2);
    ctx.lineTo(x - width/2 + radius, y + height/2);
    ctx.quadraticCurveTo(x - width/2, y + height/2, x - width/2, y + height/2 - radius);
    ctx.lineTo(x - width/2, y - height/2 + radius);
    ctx.quadraticCurveTo(x - width/2, y - height/2, x - width/2 + radius, y - height/2);
    ctx.closePath();
    
    ctx.fill();
    ctx.stroke();
    
    // Draw text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = '11px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Truncate prompt if too long
    const maxLength = 15;
    const displayText = node.prompt.length > maxLength 
      ? node.prompt.substring(0, maxLength) + '...'
      : node.prompt;
    
    ctx.fillText(displayText, x, y);
    
    // Draw preloaded indicator
    if (node.preloadedContext && node.preloadedContext.length > 0) {
      ctx.fillStyle = 'rgba(0, 255, 0, 0.8)';
      ctx.beginPath();
      ctx.arc(x + width/2 - 10, y - height/2 + 10, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Recursively draw children
    node.children.forEach((child, index) => {
      const childX = x + (index - (node.children.length - 1) / 2) * spread;
      const childY = y + 80;
      drawTree(ctx, child, childX, childY, spread * 0.7);
    });
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!tree || isMinimized) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Find clicked node
    const clickedNode = findNodeAtPosition(tree, x, y, canvas.width / 2, 50, canvas.width / 4);
    
    if (clickedNode) {
      setSelectedNode(clickedNode.id);
      onNodeSelect?.(clickedNode);
    }
  };

  const findNodeAtPosition = (
    node: PromptTreeNode,
    targetX: number,
    targetY: number,
    nodeX: number,
    nodeY: number,
    spread: number
  ): PromptTreeNode | null => {
    // Check if click is on this node
    const width = 120;
    const height = 40;
    
    if (
      targetX >= nodeX - width/2 &&
      targetX <= nodeX + width/2 &&
      targetY >= nodeY - height/2 &&
      targetY <= nodeY + height/2
    ) {
      return node;
    }
    
    // Check children
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const childX = nodeX + (i - (node.children.length - 1) / 2) * spread;
      const childY = nodeY + 80;
      
      const found = findNodeAtPosition(child, targetX, targetY, childX, childY, spread * 0.7);
      if (found) return found;
    }
    
    return null;
  };

  if (isMinimized) {
    return (
      <div style={{
        position: 'fixed',
        top: '20px',
        left: '320px',
        background: 'rgba(0, 0, 0, 0.95)',
        border: '1px solid rgba(255, 0, 0, 0.3)',
        borderRadius: '12px',
        padding: '8px 12px',
        fontSize: '11px',
        color: 'rgba(255, 255, 255, 0.7)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ color: '#ff3333' }}>🔮</span>
        <span>Prompt Tree: {tree?.children.length || 0} predictions active</span>
      </div>
    );
  }

  if (!tree) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '80px',
      left: '320px',
      right: '420px',
      height: '300px',
      background: 'rgba(0, 0, 0, 0.95)',
      border: '1px solid rgba(255, 0, 0, 0.3)',
      borderRadius: '16px',
      padding: '20px',
      zIndex: 900,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: 600,
          color: '#ff3333',
          letterSpacing: '1px',
          textTransform: 'uppercase'
        }}>
          Conversation Predictions
        </h3>
        <div style={{
          fontSize: '12px',
          color: 'rgba(255, 255, 255, 0.5)'
        }}>
          Click nodes to explore • Green dot = preloaded
        </div>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={800}
        height={240}
        onClick={handleCanvasClick}
        onMouseMove={(e) => {
          const canvas = canvasRef.current;
          if (!canvas) return;
          
          const rect = canvas.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          
          const node = findNodeAtPosition(tree, x, y, canvas.width / 2, 50, canvas.width / 4);
          setHoveredNode(node?.id || null);
          canvas.style.cursor = node ? 'pointer' : 'default';
        }}
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '12px',
          background: 'rgba(255, 255, 255, 0.02)'
        }}
      />

      {/* Selected Node Info */}
      {selectedNode && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          right: '20px',
          background: 'rgba(0, 0, 0, 0.9)',
          border: '1px solid rgba(255, 0, 0, 0.3)',
          borderRadius: '8px',
          padding: '12px',
          maxWidth: '300px',
          fontSize: '11px'
        }}>
          <div style={{ color: '#ff3333', marginBottom: '8px', fontWeight: 600 }}>
            Selected Prediction
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '4px' }}>
            {tree.children.find(n => n.id === selectedNode)?.prompt}
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
            Probability: {(tree.children.find(n => n.id === selectedNode)?.probability || 0) * 100}%
          </div>
          {tree.children.find(n => n.id === selectedNode)?.preloadedContext && (
            <div style={{ color: 'rgba(0, 255, 0, 0.7)', marginTop: '4px' }}>
              ✓ {tree.children.find(n => n.id === selectedNode)?.preloadedContext?.length} contexts preloaded
            </div>
          )}
        </div>
      )}
    </div>
  );
}