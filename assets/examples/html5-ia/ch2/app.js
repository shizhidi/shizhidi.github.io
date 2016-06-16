(function() {
  var  init = function() {
    var orderForm = document.forms.order,
        saveBtn = document.getElementById('saveOrder'),
        saveBtnClicked = false;

    //针对旧浏览器,修改表单行为
    var saveForm = function() {
      //当用户单击Save按钮时,检查浏览器是否支持formaction属性
      if(!('formAction' in document.createElement('input'))) {
        //如果所使用的浏览器不支持formaction属性,就利用setAttribute方法来手动设置表单的action属性。
        var formAction = saveBtn.getAttribute('formaction');
        orderForm.setAttribute('action',formAction);
      }
      saveBtnClicked = true;
    };
    saveBtn.addEventListener('click',saveForm, false);

    //计算金额总计,显示表单输出结果
    var qtyFields = orderForm.quantity,
        totalFields = document.getElementsByClassName('item_total'),
        orderTotalField = document.getElementById('order_total');

    var formatMoney = function(value) { //返回一个用来表示货币的格式化数值,并利用逗号来分隔千分位。
      return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };

    var calculateTotals = function() { //计算每种产品的总金额,以及整个订单的总金额。
      var i = 0,
          ln = qtyFields.length,
          itemQty = 0,
          itemPrice = 0.00,
          itemTotal = 0.00,
          itemTotalMoney = '$0.00',
          orderTotal = 0.00,
          orderTotalMoney = '$0.00';

      for(;i<ln;i++) { //用于循环计算

        //获取quantity输入字段的值
        if(!!qtyFields[i].valueAsNumber) { //测试valueAdNumber属性的存在性。!!用于将valueAsNumbers属性值强制转换成布尔类型。第一个!的作用是将属性值转变成布尔值,并对该值取非,第二个!则再次取非。
          itemQty =qtyFields[i].valueAsNumber || 0;
        } else {
          //valueAsNumber在旧浏览器中不起作用,因此采用parseFloat来进行回退
          itemQty =parseFloat(qtyFields[i].value) || 0;
        }

        //利用data-*属性获取产品价格
        if(!!qtyFields[i].dataset) {
          itemPrice =parseFloat(qtyFields[i].dataset.price);
        } else {
          //如果dataset属性不被支持,则采用getAttribute回退方案。
          itemPrice =parseFloat(qtyFields[i].getAttribute('data-price'));
        }
        itemTotal =itemQty *itemPrice;
        itemTotalMoney = '$'+formatMoney(itemTotal.toFixed(2));
        orderTotal +=itemTotal;
        orderTotalMoney = '$'+formatMoney(orderTotal.toFixed(2));

        if(!!totalFields[i].value) { //测试用户浏览器是否支持<output>元素。
          totalFields[i].value =itemTotalMoney;
          orderTotalField.value =orderTotalMoney;
        } else {
          //不支持<output>的浏览器
          totalFields[i].innerHTML =itemTotalMoney;
          orderTotalField.innerHTML =orderTotalMoney;
        }
      }
    };
    calculateTotals(); //执行初始计算,以防某个字段被预填充。由于init函数在页面加载时被调用,将会访问到预填充数据。

    var qtyListeners = function() {
      var i = 0,
          ln = qtyFields.length;
      for(;i<ln;i++) {
        qtyFields[i].addEventListener('input',calculateTotals, false);
        qtyFields[i].addEventListener('keyup',calculateTotals, false); //IE9中,input事件并不能侦测退格键与删除键的按键操作以及剪切操作,所以要绑定kepup事件。
      }
    };
    qtyListeners(); //调用此函数为字段添加事件侦听器

    //创建自定义验证和错误消息
    var doCustomValidity = function(field, msg) {
      //检测浏览器是否支持setCustomValidity方法。如果不支持,手动设定validationMessage的值。
      if('setCustomValidity' in field) {
        field.setCustomValidity(msg);
      } else {
        field.validationMessage = msg;
      }
    };

    var validateForm = function() {
      doCustomValidity(orderForm.name, '');
      doCustomValidity(orderForm.password, '');
      doCustomValidity(orderForm.confirm_password, '');
      doCustomValidity(orderForm.card_name, '');

      //如果浏览器不支持month 或者 pattern属性则调用回退方案。
      if(!Modernizr.inputtypes.month || !Modernizr.input.pattern) {
        fallbackValidation();
      }

      if(orderForm.name.value.length < 4) { //执行自定义验证检测,如果失败,则条用doCustomValidity函数
        doCustomValidity(
          orderForm.name, 'Full Name must be at least 4 characters long'
        );
      }
      if(orderForm.password.value.length < 8) {
        doCustomValidity(
          orderForm.password,
          'Password must be at least 8 characters long'
        );
      }

      if(orderForm.password.value != orderForm.confirm_password.value) {
        doCustomValidity(
          orderForm.confirm_password,
          'Confirm Password must match Password'
        );
      }

      if(orderForm.card_name.value.length < 4) {
        doCustomValidity(
          orderForm.card_name,
          'Name on Card must be at least 4 characters long'
        );
      }

    };
    orderForm.addEventListener('input', validateForm, false);
    orderForm.addEventListener('keyup', validateForm, false); //IE9中,需要用keyup事件绑定来侦测退格键、删除键及剪切操作。

    //侦听invalid事件
    var styleInvalidForm = function() {
      orderForm.className = 'invalid'; //为form元素添加一个类invalid。下一节,我们将用它来样式化已提交表单中的无效字段。
    }
    orderForm.addEventListener('invalid', styleInvalidForm, true);//侦听表单中的invalid事件以及所有其他事件。

    //如果不支持input month类型就加载monthpicker.js
    Modernizr.load({
      test: Modernizr.inputtypes.month,
      nope: 'monthpicker.js'
    });

    // 在Safari5.1中阻止无效表单的提交
    var getFieldLabel = function(field) { //该函数通过标签属性或检查该字段的标签式父元素来取回字段的标签。
      if('labels' in field && field.labels.length > 0) {
        return field.labels[0].innerText;
      }
      if(field.parentNode && field.parentNode.tagName.toLowerCase()=== 'label')
      {
        return field.parentNode.innerText;
      }
      return '';
    }

    var submitForm = function(e) {
      //在此之前,我们为Save Order按钮添加了事件。当单击该按钮时,saveBtnClicked就会被记为true。该参数可以确定表单是否应该验证。
      if(!saveBtnClicked) {
        validateForm();
        var i = 0,
            ln = orderForm.length,
            field,
            errors = [],
            errorFields = [],
            errorMsg = '';

        for(; i<ln; i++) { //遍历订单中的各个字段,检查它们是否有效。
          field = orderForm[i];
          if((!!field.validationMessage && //如果checkValidity方法存在并返回false,或者如果validationMessage属性被填充,则字段肯定出错,应该存入error和errorFields数组。
              field.validationMessage.length > 0) || (!!field.checkValidity
                                                      && !field.checkValidity())
            ) {
            errors.push(
              getFieldLabel(field)+': '+field.validationMessage
            );
            errorFields.push(field);
          }
        }

        if(errors.length > 0) { //如果出现错误,这就会阻止表单提交,并向用户显示已找到的错误,以警告用户,还将invalid类添加到订单中,以确保无效字段的样式设置正确,并把第一个无效字段设置为输入焦点。
          e.preventDefault();
          errorMsg = errors.join('\n');
          alert('Please fix the following errors:\n'+errorMsg, 'Error');
          orderForm.className = 'invalid';
          errorFields[0].focus();
        }
      }
    };
    orderForm.addEventListener('submit', submitForm, false);

    //IE9的验证回退方案
    var fallbackValidation = function() {
      var i = 0,
          ln = orderForm.length,
          field;
      for(;i<ln;i++) {
        field = orderForm[i];
        doCustomValidity(field, '');
        if(field.hasAttribute('pattern')) { //如果设置了PATTERN属性,就会将它的正则表达式与字段值进行匹配。
          var pattern = new  RegExp(field.getAttribute('pattern').toString());
          if(!pattern.test(field.value)) {
            var msg = 'Please match the requested format.';
            if(field.hasAttribute('title') &&  field.getAttribute('title').length > 0) {
              msg += ' '+field.getAttribute('title');
            }
            doCustomValidity(field, msg);
          }
        }
        if(field.hasAttribute('type') &&
           field.getAttribute('type').toLowerCase()=== 'email') { //如果输入类型是email,则利于定义好的pattern对其进行验证。
          var pattern = new RegExp(/\S+@\S+\.\S+/);
          if(!pattern.test(field.value)) {
            doCustomValidity(field, 'Please enter an email address.');
          }
        }
        if(field.hasAttribute('required') && field.value.length < 1) { //如果设置了required属性,则验证用户是否输入了值。
          doCustomValidity(field, 'Please fill out this field.');
        }
      }
    };


  };
  window.addEventListener('load',init, false);
}) ();
