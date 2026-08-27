import { ConfigProvider, App as AntApp } from 'antd'
import { useTheme } from './context/ThemeContext'
import { shade } from './utils/color'
import AppRoutes from './routes/AppRoutes'

export default function App() {
    const { primary } = useTheme()

    return (
        <ConfigProvider
            theme={{
                token: {
                    colorPrimary: primary,
                    colorInfo: primary,
                    borderRadius: 10,
                    fontFamily:
                        "'Inter', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
                    colorText: '#10192b',
                    colorTextSecondary: '#4a5568',
                    colorBorder: '#e6e9ef',
                    colorBgLayout: '#f5f7fa',
                    controlHeight: 38,
                },
                components: {
                    Button: { fontWeight: 600, primaryShadow: 'none' },
                    Menu: {
                        itemSelectedBg: shade(primary, 0.9),
                        itemSelectedColor: primary,
                        itemHeight: 44,
                        itemBorderRadius: 10,
                    },
                    Card: { borderRadiusLG: 16 },
                    Table: { headerBg: '#f8fafc', borderColor: '#e6e9ef' },
                    Segmented: { itemSelectedBg: '#ffffff' },
                },
            }}
        >
            <AntApp>
                <AppRoutes />
            </AntApp>
        </ConfigProvider>
    )
}
