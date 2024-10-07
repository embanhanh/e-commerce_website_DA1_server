const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const User = require('../models/UserModel')
const Address = require('../models/AddressModel')
const OerderProduct = require('../models/OrderProductModel')
const OrderProductModel = require('../models/OrderProductModel')

const { verifyFirebaseToken, gennerateAccessToken, gennerateRefreshToken } = require('../util/TokenUtil')

class UserController {
    // [POST] /user/login
    async login(req, res, next) {
        try {
            const { email, password } = req.body

            if (!email || !password) {
                return res.status(400).json({ message: 'Không có tài khoản' })
            }
            // Tìm user theo email
            const user = await User.findOne({ email })
            if (!user) {
                return res.status(400).json({ message: 'Tài khoản hoặc mật khẩu không chính xác, vui lòng thử lại' })
            }

            // Kiểm tra password
            const isMatch = await bcrypt.compare(password, user.password)
            if (!isMatch) {
                return res.status(400).json({ message: 'Tài khoản hoặc mật khẩu không chính xác, vui lòng thử lại' })
            }

            // Tạo token JWT
            const accessToken = await gennerateAccessToken({ data: user })
            const refreshToken = await gennerateRefreshToken({ data: user })

            // Trả về token và thông tin user
            return res.status(200).json({ token: accessToken, refreshToken: refreshToken, user: user })
        } catch (err) {
            next(err)
        }
    }
    // [POST] /user/login/facebook || /user/login/google
    async loginWithFirebase(req, res, next) {
        try {
            const { token } = req.body

            const result = await verifyFirebaseToken(token)
            if (result.success) {
                let user = await User.findOne({ email: result.user.uid })
                if (!user) {
                    user = await User.create({
                        email: result.user.uid,
                        name: result.user.name,
                        password: '',
                        urlImage: result.user.picture,
                    })
                }
                const jwtToken = await gennerateAccessToken({ data: user })
                const refreshToken = await gennerateRefreshToken({ data: user })
                return res.status(200).json({ token: jwtToken, refreshToken: refreshToken, user: user })
            } else {
                return res.status(400).json({ message: 'Đã có lỗi xảy ra trong quá trinh đăng nhập, vui lòng thử lại' })
            }
        } catch (err) {
            next(err)
        }
    }

    async refreshToken(req, res, next) {
        try {
            const { refreshToken } = req.body
            if (!refreshToken) {
                return res.status(401).json({ message: 'Refresh token is required' })
            }

            jwt.verify(refreshToken, 'refresh_token', (err, user) => {
                if (err) return res.status(403).json({ message: 'Invalid refresh token' })

                const accessToken = gennerateAccessToken({ data: user.data })
                res.json({ accessToken })
            })
        } catch (error) {
            next(error)
        }
    }

    // [POST] /user/register
    async register(req, res, next) {
        try {
            const { email, password } = req.body

            if (!email || !password) {
                return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin' })
            }

            let user = await User.findOne({ email })
            if (user) {
                return res.status(400).json({ message: 'Email đã tồn tại, vui lòng nhập lại email' })
            }

            user = new User({ email, password })
            await user.save()

            return res.status(201).json({ user: { id: user._id, email: user.email } })
        } catch (err) {
            next(err)
        }
    }

    // [GET] /user/purchase
    async getPurchase(req, res, next) {
        try {
            const user = req.user
            const idUser = user._id
            const orders = await OerderProduct.find({ user: idUser })
                .populate({
                    path: 'products.product',
                    populate: {
                        path: 'product',
                    },
                })
                .populate('shippingAddress')
                .populate('user')
                .populate('vouchers.voucher')
            return res.status(200).json(orders)
        } catch (err) {
            next(err)
        }
    }
    // [GET] /user/purchase/order/:id
    async getOrderDetail(req, res, next) {
        try {
            const user = req.user
            const idUser = user._id
            const id = req.params.id
            const order = await OerderProduct.findOne({ user: idUser, _id: id })
                .populate({
                    path: 'products.product',
                    populate: {
                        path: 'product',
                    },
                })
                .populate('shippingAddress')
                .populate('user')
                .populate('vouchers.voucher')
            return res.status(200).json(order)
        } catch (err) {
            next(err)
        }
    }

    // [GET] /user/account/profile
    async getProfileUser(req, res, next) {
        try {
            const user = req.user
            const idUser = user.data._id
            const userFind = User.findOne({ _id: idUser })
            if (!userFind) {
                return res.status(404).json({ message: 'No user founded.' })
            }
            return res.status(200).json(userFind)
        } catch (err) {
            next(err)
        }
    }
    // [PUT] /user/account/profile/edit
    async updateProfileUser(req, res, next) {
        try {
            const user = req.user
            const idUser = user.data._id
            const { name, gender, birthday, phone, urlImage } = req.body
            const userFind = await User.findOne({ _id: idUser })
            if (!userFind) {
                return res.status(404).json({ message: 'No user founded.' })
            }
            userFind.name = name
            userFind.gender = gender
            userFind.birthday = birthday
            userFind.phone = phone
            userFind.urlImage = urlImage
            await userFind.save()
            return res.status(200).json(userFind)
        } catch (err) {
            next(err)
        }
    }
    // [GET] /user/account/address
    async getAddressUser(req, res, next) {
        try {
            const user = req.user
            const idUser = user.data._id
            const address = await Address.find({ user: idUser }).populate('user')
            return res.status(200).json(address)
        } catch (err) {
            next(err)
        }
    }
    // [POST] /user/account/address/create
    async createAddressUser(req, res, next) {
        try {
            const { _id: userId } = req.user.data
            const { name, phone, location, type, default: isDefault } = req.body

            const address = await Address.create({
                user: userId,
                name,
                phone,
                location,
                type,
                default: isDefault,
            })

            return res.status(201).json(address)
        } catch (err) {
            next(err)
        }
    }
    // [PUT] /user/account/address/update/:id
    async updateAddressUser(req, res, next) {
        try {
            const { _id: userId } = req.user.data
            const { name, phone, location, type, default: isDefault } = req.body
            const id = req.params.id
            const address = await Address.findByIdAndUpdate(id, {
                user: userId,
                name,
                phone,
                location,
                type,
                default: isDefault,
            })

            return res.status(200).json(address)
        } catch (err) {
            next(err)
        }
    }
    // [DELETE] /user/account/address/delete/:id
    async deleteAddressUser(req, res, next) {
        try {
            const id = req.params.id
            await Address.findOneAndDelete({ _id: id })
            return res.status(200).json({ message: 'Địa chỉ đã được xóa thành công' })
        } catch (err) {
            next(err)
        }
    }
    // [GET] /user/account/payment
    async getPaymentUser(req, res, next) {
        try {
            const user = req.user
            const idUser = user._id
        } catch (err) {
            next(err)
        }
    }
}

module.exports = new UserController()
