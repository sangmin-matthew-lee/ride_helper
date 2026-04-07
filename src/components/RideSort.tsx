"use client";
import { Location } from "@/types";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "@hello-pangea/dnd";
import { motion } from "framer-motion";
import styles from "./RideSort.module.css";

interface Props {
  stops: Location[];
  onBack: () => void;
  onStart: (stops: Location[]) => void;
  onChange: (stops: Location[]) => void;
}

export default function RideSort({ stops, onBack, onStart, onChange }: Props) {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const items = Array.from(stops);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    onChange(items);
  };

  return (
    <div className={styles.wrapper}>
      <div className="page-container">
        <div className={styles.header}>
          <button className="btn btn-ghost" onClick={onBack} id="ride-sort-back-btn" style={{ padding: "8px 0", marginLeft: "-4px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            뒤로
          </button>
          <h1 className={styles.title}>순서 설정</h1>
          <p className={styles.subtitle}>드래그해서 방문 순서를 정해요</p>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="stops">
            {(provided) => (
              <div
                className={styles.list}
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {stops.map((stop, index) => (
                  <Draggable key={stop.id} draggableId={stop.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`${styles.item} ${snapshot.isDragging ? styles.dragging : ""}`}
                      >
                        <div className={styles.orderBadge}>{index + 1}</div>
                        <div className={styles.itemInfo}>
                          <span className={styles.nickname}>{stop.nickname}</span>
                          <span className={styles.address}>{stop.address}</span>
                        </div>
                        <div
                          {...provided.dragHandleProps}
                          className={styles.handle}
                          aria-label="drag handle"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="8" y1="6" x2="21" y2="6"/>
                            <line x1="8" y1="12" x2="21" y2="12"/>
                            <line x1="8" y1="18" x2="21" y2="18"/>
                            <line x1="3" y1="6" x2="3.01" y2="6"/>
                            <line x1="3" y1="12" x2="3.01" y2="12"/>
                            <line x1="3" y1="18" x2="3.01" y2="18"/>
                          </svg>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Start button */}
      <motion.div
        className={styles.bottomBar}
        initial={{ y: 80 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className={styles.bottomBarInner}>
          <div className={styles.routeSummary}>
            {stops.map((s, i) => (
              <span key={s.id} className={styles.routeChip}>
                {i > 0 && <span className={styles.arrow}>→</span>}
                {s.nickname}
              </span>
            ))}
          </div>
          <button
            className={`btn btn-primary ${styles.startBtn}`}
            onClick={() => onStart(stops)}
            id="ride-start-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            라이드 시작
          </button>
        </div>
      </motion.div>
    </div>
  );
}
