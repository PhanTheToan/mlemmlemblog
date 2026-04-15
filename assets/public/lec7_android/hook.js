setTimeout(
    function (){
        function rpad(width, string, pad){
            return (width <= string.length) ? string : rpad(width,pad+string,pad);
        }
        function getPin(pin){
            return rpad(6,pin,'0');
        }
        Java.perform(
            function() {
                const SecretBox = Java.use('org.libsodium.jni.crypto.SecretBox');
                const Hex = Java.use('org.libsodium.jni.encoders.Hex');
                const JString = Java.use('java.lang.String');
                const MainActivity = Java.use('com.hackerone.mobile.challenge2.MainActivity');
                const cipher = '9646D13EC8F8617D1CEA1CF4334940824C700ADF6A7A3236163CA2C9604B9BE4BDE770AD698C02070F571A0B612BBD3572D81F99';
                const iv = 'aabbccddeeffgghhaabbccdd';
                const BATCH_SIZE = 200;
                const PAUSE_MS = 1;
                const LOG_EVERY = 1000;

                Java.choose('com.hackerone.mobile.challenge2.MainActivity',{
                    onMatch : function(instance){
                        console.log("Found Instance");

                        let counter = 0;
                        let i = 999999;
                        let found = false;
                        const cipherText = Hex.$new().decode(cipher);
                        const nonce = JString.$new(iv).getBytes();

                        function step(){
                            if(found || i < 0){
                                return;
                            }

                            const stop = Math.max(i - BATCH_SIZE, -1);
                            for(; i > stop; i--){
                                const pin = getPin(i.toString());
                                try{
                                    const key = instance.getKey(pin);
                                    counter++;
                                    if(counter >= 51){
                                        counter = 0;
                                        instance.resetCoolDown();
                                    }

                                    let box = null;
                                    try{
                                        box = SecretBox.$new(key);
                                        box.decrypt(nonce,cipherText);
                                        console.log("Found Pin: " + pin + " Hex: " + MainActivity.bytesToHex(key));
                                        found = true;
                                        break;
                                    }catch(err){
                                        // wrong pin
                                    }finally{
                                        if(box !== null){
                                            try{
                                                box.$dispose();
                                            }catch(err){
                                                // nothing
                                            }
                                        }
                                    }
                                }catch(err){
                                    // nothing
                                }

                                if(!found && i % LOG_EVERY === 0){
                                    console.log("Checked down to PIN: " + getPin(i.toString()));
                                }
                            }

                            if(!found && i >= 0){
                                setTimeout(step, PAUSE_MS);
                            }
                        }

                        step();
                    },
                    onComplete : function(){
                        console.log('End!');
                    }
                })

            }
        );
    },0
);
