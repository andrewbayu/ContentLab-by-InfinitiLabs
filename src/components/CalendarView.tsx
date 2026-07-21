import React, { useState } from 'react';
import type { ContentItem, Channel } from '../services/sheets';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface CalendarViewProps {
  items: ContentItem[];
  channels: Channel[];
  onEditItem: (item: ContentItem) => void;
  onMoveDate: (id: string, newDate: string) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  items,
  channels,
  onEditItem,
  onMoveDate,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Calendar dates generation
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDayOfMonth.getDay(); // 0: Sunday, 1: Monday, etc.
  const daysInMonth = lastDayOfMonth.getDate();

  // Days from previous month to fill the first row
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  const prevMonthDays = Array.from(
    { length: startDayOfWeek },
    (_, i) => prevMonthLastDay - startDayOfWeek + 1 + i
  );

  // Current month days
  const currentMonthDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Total days to display (we fill the grid to 42 cells standard 6 rows)
  const totalCells = 42;
  const nextMonthDaysCount = totalCells - (prevMonthDays.length + currentMonthDays.length);
  const nextMonthDays = Array.from({ length: nextMonthDaysCount }, (_, i) => i + 1);

  // Navigation handlers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleGoToToday = () => {
    setCurrentDate(new Date());
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    e.dataTransfer.setData('text/plain', itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData('text/plain');
    if (itemId) {
      onMoveDate(itemId, targetDateStr);
    }
  };

  // Get color for channel
  const getChannelColor = (channelName: string) => {
    const found = channels.find((c) => c.name.toLowerCase() === channelName.toLowerCase());
    return found ? found.color : '#7c3aed';
  };

  // Check if date matches
  const getItemsForDate = (y: number, m: number, d: number) => {
    const mStr = String(m + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    const dateStr = `${y}-${mStr}-${dStr}`;
    return items.filter((item) => (item.taskType === 'General' ? item.dueDate : item.publishDate) === dateStr);
  };

  const isToday = (d: number, isCurrent: boolean) => {
    const today = new Date();
    return (
      isCurrent &&
      today.getDate() === d &&
      today.getMonth() === month &&
      today.getFullYear() === year
    );
  };

  return (
    <div className="page-container" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      
      {/* Calendar Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        backgroundColor: 'var(--bg-card)',
        padding: '16px 20px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarIcon size={20} className="text-secondary" />
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0, fontFamily: 'var(--font-headings)' }}>
            {monthNames[month]} {year}
          </h2>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={handleGoToToday} style={{ padding: '8px 14px' }}>
            Today
          </button>
          <button className="btn btn-secondary btn-icon-only" onClick={handlePrevMonth} title="Previous Month">
            <ChevronLeft size={16} />
          </button>
          <button className="btn btn-secondary btn-icon-only" onClick={handleNextMonth} title="Next Month">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Weekday Titles */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        textAlign: 'center',
        fontWeight: 600,
        fontSize: '13px',
        color: 'var(--text-secondary)',
        paddingBottom: '8px',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div>SUN</div>
        <div>MON</div>
        <div>TUE</div>
        <div>WED</div>
        <div>THU</div>
        <div>FRI</div>
        <div>SAT</div>
      </div>

      {/* Calendar Grid cells */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gridTemplateRows: 'repeat(6, 1fr)',
        flexGrow: 1,
        borderLeft: '1px solid var(--border-subtle)',
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: '#f8fafc',
        minHeight: '480px'
      }}>
        {/* Render Previous Month Days */}
        {prevMonthDays.map((d, index) => {
          const pm = month === 0 ? 11 : month - 1;
          const py = month === 0 ? year - 1 : year;
          const dateStr = `${py}-${String(pm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const cellItems = getItemsForDate(py, pm, d);

          return (
            <div
              key={`prev-${index}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, dateStr)}
              style={{
                backgroundColor: 'white',
                borderRight: '1px solid var(--border-subtle)',
                borderTop: '1px solid var(--border-subtle)',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                opacity: 0.4,
                overflowY: 'auto'
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 550, color: 'var(--text-muted)' }}>{d}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                {cellItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onEditItem(item)}
                    style={{
                      fontSize: '11px',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      backgroundColor: '#f1f5f9',
                      borderLeft: `3px solid ${getChannelColor(item.channel)}`,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontWeight: 500
                    }}
                    title={item.title}
                  >
                    {item.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Render Current Month Days */}
        {currentMonthDays.map((d) => {
          const cellItems = getItemsForDate(year, month, d);
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const activeCell = isToday(d, true);

          return (
            <div
              key={`curr-${d}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, dateStr)}
              style={{
                backgroundColor: 'white',
                borderRight: '1px solid var(--border-subtle)',
                borderTop: '1px solid var(--border-subtle)',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
                overflowY: 'auto',
                transition: 'background-color 0.2s'
              }}
            >
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 700,
                  color: activeCell ? 'white' : 'var(--text-primary)',
                  backgroundColor: activeCell ? 'var(--primary)' : 'transparent',
                  width: activeCell ? '22px' : 'auto',
                  height: activeCell ? '22px' : 'auto',
                  borderRadius: activeCell ? '50%' : '0',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  alignSelf: 'flex-start'
                }}
              >
                {d}
              </span>

              {/* Items List inside cell */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                {cellItems.map((item) => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onClick={() => onEditItem(item)}
                    style={{
                      fontSize: '11px',
                      padding: '5px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(241, 245, 249, 0.8)',
                      borderLeft: `3.5px solid ${getChannelColor(item.channel)}`,
                      cursor: 'grab',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontWeight: 600,
                      boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '4px'
                    }}
                    title={`${item.title} (${item.assignee})`}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</span>
                    {item.assignee && (
                      <span 
                        style={{ 
                          fontSize: '8px', 
                          color: 'var(--text-secondary)', 
                          backgroundColor: 'rgba(0,0,0,0.05)', 
                          padding: '1px 3px', 
                          borderRadius: '2px',
                          flexShrink: 0
                        }}
                      >
                        {item.assignee.split(' ')[0]}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Render Next Month Days */}
        {nextMonthDays.map((d, index) => {
          const nm = month === 11 ? 0 : month + 1;
          const ny = month === 11 ? year + 1 : year;
          const dateStr = `${ny}-${String(nm + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const cellItems = getItemsForDate(ny, nm, d);

          return (
            <div
              key={`next-${index}`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, dateStr)}
              style={{
                backgroundColor: 'white',
                borderRight: '1px solid var(--border-subtle)',
                borderTop: '1px solid var(--border-subtle)',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                opacity: 0.4,
                overflowY: 'auto'
              }}
            >
              <span style={{ fontSize: '11px', fontWeight: 550, color: 'var(--text-muted)' }}>{d}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                {cellItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onEditItem(item)}
                    style={{
                      fontSize: '11px',
                      padding: '4px 6px',
                      borderRadius: '4px',
                      backgroundColor: '#f1f5f9',
                      borderLeft: `3px solid ${getChannelColor(item.channel)}`,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      fontWeight: 500
                    }}
                    title={item.title}
                  >
                    {item.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
