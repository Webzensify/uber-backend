import express from 'express'
import cors from 'cors'
import {connectToMongo} from './db.js'
import {router as authRouter} from './routes/authRouter.js'
connectToMongo()
const port = 3002
const app = express()
app.use(express.json())
app.use(cors())
app.use("/api/auth", authRouter)
app.listen(port, ()=> {
    console.log(`app listening at port ${port}`)
})