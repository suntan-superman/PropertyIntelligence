import React,{useEffect,useId,useMemo,useRef,useState} from 'react';
import './themed-select.css';

function optionText(children){
  return React.Children.toArray(children).map(child=>typeof child==='string'||typeof child==='number'?String(child):React.isValidElement(child)?optionText(child.props.children):'').join('');
}

function collectOptions(children,result=[]){
  React.Children.forEach(children,child=>{
    if(!React.isValidElement(child))return;
    if(child.type==='option'){
      const label=optionText(child.props.children);
      result.push({value:String(child.props.value??label),label,disabled:Boolean(child.props.disabled)});
      return;
    }
    if(child.type===React.Fragment||child.type==='optgroup')collectOptions(child.props.children,result);
  });
  return result;
}

export function ThemedSelect({children,value,defaultValue,onChange,disabled=false,className='',name,...props}){
  const options=useMemo(()=>collectOptions(children),[children]);
  const controlled=value!==undefined;
  const initial=String(defaultValue??options.find(option=>!option.disabled)?.value??'');
  const [localValue,setLocalValue]=useState(initial),[open,setOpen]=useState(false),[active,setActive]=useState(0);
  const root=useRef(null),trigger=useRef(null),typeahead=useRef({text:'',timer:null});
  const uid=useId().replaceAll(':',''),listId=`pi-select-${uid}`;
  const selectedValue=String(controlled?value??'':localValue),selectedIndex=Math.max(0,options.findIndex(option=>option.value===selectedValue));
  const selected=options[selectedIndex]??{label:'Select',value:''};

  useEffect(()=>{
    const dismiss=event=>{if(!root.current?.contains(event.target))setOpen(false);};
    document.addEventListener('pointerdown',dismiss);
    return()=>{document.removeEventListener('pointerdown',dismiss);clearTimeout(typeahead.current.timer);};
  },[]);
  useEffect(()=>{if(open)setActive(selectedIndex);},[open,selectedIndex]);

  const choose=next=>{
    if(!next||next.disabled)return;
    if(!controlled)setLocalValue(next.value);
    const target={value:next.value,name};
    onChange?.({target,currentTarget:target});
    setOpen(false);
    requestAnimationFrame(()=>trigger.current?.focus());
  };
  const move=direction=>{
    if(!options.length)return;
    let next=active;
    for(let count=0;count<options.length;count+=1){next=(next+direction+options.length)%options.length;if(!options[next].disabled)break;}
    setActive(next);
  };
  const keyDown=event=>{
    if(disabled)return;
    if(event.key==='Escape'&&open){event.preventDefault();setOpen(false);return;}
    if(event.key==='Tab'){setOpen(false);return;}
    if(event.key==='ArrowDown'||event.key==='ArrowUp'){
      event.preventDefault();
      if(!open){setOpen(true);setActive(selectedIndex);}else move(event.key==='ArrowDown'?1:-1);
      return;
    }
    if(event.key==='Home'&&open){event.preventDefault();setActive(options.findIndex(option=>!option.disabled));return;}
    if(event.key==='End'&&open){event.preventDefault();for(let index=options.length-1;index>=0;index-=1)if(!options[index].disabled){setActive(index);break;}return;}
    if((event.key==='Enter'||event.key===' ')&&open){event.preventDefault();choose(options[active]);return;}
    if(event.key==='Enter'||event.key===' '){event.preventDefault();setOpen(true);return;}
    if(event.key.length===1&&!event.altKey&&!event.ctrlKey&&!event.metaKey){
      const search=(typeahead.current.text+event.key).toLowerCase();
      typeahead.current.text=search;clearTimeout(typeahead.current.timer);typeahead.current.timer=setTimeout(()=>{typeahead.current.text='';},650);
      const match=options.findIndex(option=>!option.disabled&&option.label.toLowerCase().startsWith(search));
      if(match>=0){event.preventDefault();setOpen(true);setActive(match);}
    }
  };
  const proxyChange=event=>choose(options.find(option=>option.value===event.target.value));

  return <div className={`pi-themed-select ${className}`.trim()} ref={root}>
    <select className="pi-native-select-proxy" aria-label={props['aria-label']} aria-hidden="true" tabIndex={-1} name={name} value={selectedValue} onChange={proxyChange}>{children}</select>
    <button {...props} ref={trigger} type="button" className="pi-select-trigger" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} aria-activedescendant={open?`${listId}-option-${active}`:undefined} disabled={disabled} onClick={()=>setOpen(current=>!current)} onKeyDown={keyDown}><span>{selected.label}</span><svg aria-hidden="true" viewBox="0 0 16 16"><path d="m4 6 4 4 4-4"/></svg></button>
    {open&&<div id={listId} className="pi-select-menu" role="listbox" aria-label={props['aria-label']}>{options.map((option,index)=><div id={`${listId}-option-${index}`} role="option" aria-selected={option.value===selectedValue} aria-disabled={option.disabled||undefined} data-active={index===active||undefined} key={`${option.value}-${index}`} onMouseEnter={()=>!option.disabled&&setActive(index)} onPointerDown={event=>event.preventDefault()} onClick={()=>choose(option)}>{option.label}</div>)}</div>}
  </div>;
}

export default ThemedSelect;
