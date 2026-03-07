import { useState, type ReactNode } from "react"

type PanelProps = {
    title: string
    children: ReactNode

}

export function Panel({ title, children }: PanelProps) {
    const [collapsed, setCollapsed] = useState<boolean>(false);
    return (

        <>
            <div className="panel2">
                <div className="panel2header flex flex-row justify-between">
                    <h2 className="">{title}</h2>
                    <button className="" onClick={(_e) => setCollapsed(!collapsed)}> {collapsed ? <i className="fa-solid fa-angle-down"></i> : <i className="fa-solid fa-angle-up"></i>}</button>
                </div>
                {!collapsed &&
                    <div className="panel2content">
                        {children}
                    </div>}
            </div>
        </>


    )
}