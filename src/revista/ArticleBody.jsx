import React from 'react';
import { imageSrc } from '../lib/media.js';
import { Link } from '../lib/router.jsx';
import '../styles/revista.css';

// Texto con formato: cada parte ya viene validada (sin HTML), acá solo se arma con elementos de React.
export function Inline({ parts = [] }) {
  return parts.map((part, i) => {
    if (part.t === 'b') return <strong key={i}>{part.v}</strong>;
    if (part.t === 'i') return <em key={i}>{part.v}</em>;
    if (part.t === 'a') {
      return part.href.startsWith('/')
        ? <Link key={i} to={part.href}>{part.v}</Link>
        : <a key={i} href={part.href} target="_blank" rel="noopener noreferrer">{part.v}</a>;
    }
    return <React.Fragment key={i}>{part.v}</React.Fragment>;
  });
}

export function ArticleBody({ blocks = [], dropCap = true }) {
  let firstParagraph = dropCap;
  return (
    <div className="rv-body">
      {blocks.map((block, i) => {
        switch (block.type) {
          case 'h':
            return <h2 key={i} className="rv-b-h"><Inline parts={block.text} /></h2>;
          case 'q':
            return <p key={i} className="rv-b-q"><Inline parts={block.text} /></p>;
          case 'a':
            return <p key={i} className="rv-b-a"><Inline parts={block.text} /></p>;
          case 'quote':
            return (
              <blockquote key={i} className="rv-b-quote">
                <p><Inline parts={block.text} /></p>
                {block.by && <cite>{block.by}</cite>}
              </blockquote>
            );
          case 'list':
            return <ul key={i} className="rv-b-list">{block.items.map((item, j) => <li key={j}><Inline parts={item} /></li>)}</ul>;
          case 'image':
            return (
              <figure key={i} className="rv-b-figure">
                <img src={imageSrc(block.src, 1400)} alt={block.caption || ''} loading="lazy" />
                {block.caption && <figcaption>{block.caption}</figcaption>}
              </figure>
            );
          case 'rule':
            return <hr key={i} className="rv-b-rule" />;
          default: {
            const lead = firstParagraph;
            firstParagraph = false;
            return <p key={i} className={lead ? 'rv-b-p is-lead' : 'rv-b-p'}><Inline parts={block.text} /></p>;
          }
        }
      })}
    </div>
  );
}
